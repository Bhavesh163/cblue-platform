📌Executive summary

* Development of customer support AI chatbot for a website. The information that the chatbot get to answer is only from or related to website.



* Single-monorepo, modular services (keep /common/ utilities). ✅



* Model runs as a single long-lived FP32 process on the RTX 3090, It uses OpenThaiGPT 1.5 14B Instruct FP32, runs fully on a local machine (e.g., RTX 3090) with PyTorch 2.5.1+cu124 with CUDA 12.8 on ubuntu22.04 exposed over a local RPC/UNIX socket. Use a queued worker to serialize GPU work (1 active inference at a time, small worker pool 1–2). ✅



* Frontend unchanged (you said keep it). Use the existing React widget with WebSocket/SSE streaming. ✅



* Retrieval: Hybrid BM25 + FAISS on local embeddings; reindex via admin UI. ✅



* Safety \& guardrails: RAG-only answers for factual content; explicit disclaimers for legal content; PII redaction and opt-out. ✅



* Production concerns: rate limits, queue length caps, memory guards, metrics, backups, CI checks, and an emergency fallback model (small distilled CPU model or canned FAQ responses). ✅










📌Architecture



1. Monorepo layout (follow your /cblue-ai/ layout in Mod2). Keep /common/ for reuse.



2\. Runtime components

* Model Service (GPU) — single process, OpenThaiGPT 1.5 14B Instruct FP32 (Hugging Face, local) is at \\\\wsl.localhost\\Ubuntu-24.04\\home\\ballhog\\Litigation\_ai\\models\\14b.
* Runs fully local on RTX 3090; FP32 for full precision legal reasoning, loads model once. Exposes gRPC/HTTP over a local UNIX socket (e.g., /var/run/openthaigpt.sock) and supports streaming. Lives in /services/\*/model\_service/ and optionally runs outside Docker (venv) or inside a GPU-enabled container.
* API Backend (FastAPI) — web/API endpoints, WebSocket streaming to frontend, auth, job queue client, retrieval client. Runs in Docker.
* Retrieval Service — FAISS index store + BM25 local process (can be a module under /common/retrieval/). Reindex via admin UI.
* Queue + Cache — Redis for queue (RQ/Redis Streams) and cache (session state). Use Redis to persist job queue and pubsub for streaming updates.
* DB — Postgres for audit logs, config, admin content, and versioned docs.
* Reverse Proxy — Nginx for TLS, rate limiting, and static assets.
* Observability — Prometheus, Grafana, Sentry.
* Admin UI — React separate app to manage docs, reindex, review feedback, escalate.





Diagram (conceptual): Frontend ←(WebSocket)→ FastAPI ←(Redis queue)→ Worker ←(UNIX socket/gRPC)→ Model Service (GPU)

Retrieval (FAISS/BM25) is called inside the worker before model call.







📌Key design rules (simple)



1. Best practices take precedence — follow secure CI, tests, monitoring, immutable builds. If conflicts, choose best practice → Mod2 → Mod1.



2\. Single GPU process — do NOT spawn per-request model processes. Load once, serve many requests via queue.



3\. Streaming + backpressure — stream tokens to client but enforce queue length and per-user rate limits. If queue full, return a human-friendly message and suggest escalation.



4\. Fail-safe fallbacks — On OOM or crash: swap to small distilled model (CPU) or serve cached FAQ answers. Don’t pretend to be the big model when it’s unavailable. (Honest bots are cutest.)



(Joke: If the model ever gets stage fright, press Ctrl+Alt+Del — for dramatic effect only. 😅)







📌Model serving specifics (practical)



* Load: transformers/custom loader using torch.cuda.set\_per\_process\_memory\_fraction() + with torch.no\_grad(): for inference. Keep FP32 (your requirement).



* Worker pool: single main inference worker. Optionally 2nd low-priority worker for short cached answers.



* Queue: Redis Streams or RQ. Job payload: {user, convo\_id, message, top\_k\_retrieval\_ids, max\_tokens}.



* Streaming: model returns tokens; worker publishes token chunks to Redis pubsub; FastAPI subscribed and pushes to WebSocket.



* Memory guard: spawn model with ulimit/cgroups GPU memory limits if inside container and watch with nvidia-smi monitor script. On OOM, auto-restart worker and failover to small model.



* Max concurrency: 1 active inference job; allow N pending jobs (configurable, e.g., 50). If exceeded, return “system busy — try again or escalate.”



Example minimal CLI-run pattern (conceptual):

\# model\_service: run once, create UNIX socket

PYTHONPATH=. python model\_service/run.py --socket /var/run/openthaigpt.sock --precision fp32







📌Retrieval \& RAG (simple steps)



1. Preprocess docs: normalize Thai text (PyThaiNLP), split to 200–600 token chunks.



2\. Embeddings: local sentence-transformer (Thai capable).



3\. Index: FAISS flat or IVF+PQ (if many docs) with namespaces per bot. Also keep BM25 (Whoosh or ElasticLite) for lexical search.



4\. On query: do BM25 + vector retrieve → hybrid score → pick top N with threshold. If score < threshold, flag low-confidence and escalate. Always attach source snippets + links.









📌Security, privacy, compliance (plain)



* TLS everywhere (Nginx).



* JWT short-lived for browser sessions + CSRF protections.



* PII redaction pipeline: before logging or indexing, detect phone numbers, IDs, emails — redact or mask; allow opt-out for transcript retention.



* Encryption at rest: Postgres and FAISS files encrypted (OS-level or filesystem encryption).



* Audit \& disclaimer: for legal topics show: “This is informational only — not legal advice.” add consent checkbox on first use.







📌CI/CD, testing \& release (best practice)



* Pre-commit (ruff, black, isort), mypy type-checks.



* Unit tests for retrieval, prompt templates, auth. Integration tests to simulate queue→model (mock model).



* Docker multi-stage builds: keep CUDA runtime only in final image; build with base CUDA dev image but strip dev libs out. (You already follow this idea.)



* Canary \& rollout: test model changes in staging VM, then promote.







📌Monitoring \& SLOs (what to track — simple list)

* request\_latency p50/p95/p99
* model\_inference\_time (per token \& total)
* queue\_length \& job\_age
* model\_memory\_util / OOM\_rate
* human\_escalation\_rate
* user\_feedback\_score

Alerts: queue\_length > X, OOM events, p99 latency > SLO.









📌Admin \& ops (day-to-day)



* Admin UI: reindex, edit docs, view bad responses, force-evict caches, trigger re-training candidate exports.



* Backups: nightly DB dumps + FAISS index snapshot + artifacts.



* Recovery plan: documented steps to bring model back (stop service, clear stale GPU memory, restart model service).



* Logs: structured JSON into file + ship to ELK/Sentry.



(Joke: If ops ever say “It works on my machine,” send them to the GPU gym for a workout. 🏋️‍♂️)















📌Folder structure:



C:\\

└─ Cblue\\

   └─ customer\_support\\                     # MONOREPO ROOT (keep this in git)

      ├── .gitignore

      ├── README.md

      ├── LICENSE

      ├── .env.template                      # template for service envs (no secrets)

      ├── infra/                             # infra scripts \& helpers (not sensitive)

      │   ├── setup\_dev\_env.ps1

      │   ├── setup\_prod\_env.ps1

      │   ├── backup\_faiss.ps1

      │   ├── restore\_faiss.ps1

      │   └── ci\_build.sh

      │

      ├── common/                            # shared libraries across bots

      │   ├── nlp\_utils/

      │   │   ├── \_\_init\_\_.py

      │   │   ├── thai\_normalize.py

      │   │   └── tokenizer.py

      │   ├── retrieval/

      │   │   ├── \_\_init\_\_.py

      │   │   ├── hybrid\_search.py

      │   │   └── index\_store.py

      │   ├── prompting/

      │   │   ├── \_\_init\_\_.py

      │   │   └── templates.py

      │   ├── ocr/

      │   └── schemas/

      │       └── pydantic\_models.py

      │

      ├── services/

      │   ├── customer\_support\_bot/

      │   │   ├── backend/                     # FastAPI service (containerized)

      │   │   │   ├── app/

      │   │   │   │   ├── main.py

      │   │   │   │   ├── router\_chat.py

      │   │   │   │   ├── retriever.py

      │   │   │   │   ├── prompt\_templates.py

      │   │   │   │   ├── queue\_client.py

      │   │   │   │   ├── auth.py

      │   │   │   │   └── schemas.py

      │   │   │   ├── Dockerfile.api

      │   │   │   └── docker-compose.yml       # service-level compose for local dev

      │   │   │

      │   │   ├── model\_service/               # model process (recommended outside Docker or GPU-container)

      │   │   │   ├── run.py                   # starts model, listens on UNIX socket /var/run/openthaigpt.sock

      │   │   │   ├── model\_utils.py

      │   │   │   ├── Dockerfile.model        # optional: GPU container image if you prefer containerized model

      │   │   │   └── venv/                   # (if you run as venv on host; not committed)

      │   │   │

      │   │   ├── frontend/                    # React chat widget (keep appearance unchanged)

      │   │   │   ├── widget/

      │   │   │   │   ├── src/

      │   │   │   │   └── package.json

      │   │   │   └── admin\_ui/                # admin UI to reindex/manage docs

      │   │   │

      │   │   ├── data/                        # DOCUMENTS / index sources (GIT-IGNORED)

      │   │   │   ├── website\_html/            # place scraped website HTML (git-ignored)

      │   │   │   ├── pdfs/

      │   │   │   └── sitemap.json

      │   │   │

      │   │   ├── docker/                      # docker-compose for this service (production dev)

      │   │   │   ├── nginx/

      │   │   │   │   └── conf.d/

      │   │   │   ├── Dockerfile.api -> ../../backend/Dockerfile.api

      │   │   │   └── volumes.env

      │   │   │

      │   │   └── scripts/

      │   │       ├── index\_docs.py            # build FAISS + BM25 index from data/

      │   │       ├── reindex\_watchdog.sh

      │   │       └── export\_retrain\_candidates.sh

      │   │

      │   └── chatbot\_template/                # template for duplicating new bots (empty data/)

      │

      ├── ops/                                # orchestration, monitoring, infra compose

      │   ├── docker-compose.yml              # orchestrate nginx, db, redis, grafana, customer\_support\_backend

      │   ├── prometheus/

      │   └── grafana/

      │

      └── docs/

          ├── architecture.md

          ├── runbook.md                       # recovery steps, OOM handling

          ├── monitoring.md

          └── duplication\_guide.md             # step-by-step to clone to new server

