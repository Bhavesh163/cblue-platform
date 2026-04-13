# Cblue AI - Enterprise Architecture Documentation

## Executive Summary

Cblue AI is an enterprise-grade AI-powered customer engagement platform that provides intelligent multilingual chatbot services (English, Thai, Chinese) for businesses. The system is built on a microservices architecture emphasizing scalability, reliability, and maintainability.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [High-Level Architecture](#high-level-architecture)
4. [Folder Structure](#folder-structure)
5. [Component Architecture](#component-architecture)
6. [Data Architecture](#data-architecture)
7. [Infrastructure Architecture](#infrastructure-architecture)
8. [Security Architecture](#security-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Integration Architecture](#integration-architecture)
11. [Monitoring & Observability](#monitoring--observability)
12. [Scalability & Performance](#scalability--performance)
13. [Disaster Recovery & Business Continuity](#disaster-recovery--business-continuity)

---

## System Overview

### Business Context

Cblue AI provides comprehensive AI/Digital solutions, smart technology, renewable energy solutions, and construction services. The platform's chatbot serves as the primary customer engagement interface, handling inquiries across multiple languages and service domains.

### Core Capabilities

- **Multilingual AI Chatbot**: Real-time conversational AI supporting English, Thai, and Chinese
- **Knowledge Base Management**: Comprehensive service information repository
- **PII Redaction**: Automatic detection and protection of sensitive information
- **Semantic Search**: Hybrid retrieval system for accurate content matching
- **Asynchronous Processing**: Non-blocking message handling with Redis pub/sub
- **Real-time Communication**: WebSocket support for instant responses

---

## Architecture Principles

### 1. Microservices Architecture
- **Service Isolation**: Each service has a single, well-defined responsibility
- **Independent Deployment**: Services can be deployed independently
- **Technology Diversity**: Each service can use the most appropriate technology stack
- **Fault Isolation**: Failures in one service don't cascade to others

### 2. Scalability
- **Horizontal Scaling**: Services can scale independently based on load
- **Stateless Services**: API services maintain no session state
- **Distributed Caching**: Redis for high-performance data access
- **Load Distribution**: Nginx reverse proxy with load balancing

### 3. Reliability
- **Health Checks**: Each service implements health check endpoints
- **Graceful Degradation**: System provides fallback responses when components fail
- **Circuit Breakers**: Prevent cascading failures
- **Data Persistence**: PostgreSQL with volume-backed storage

### 4. Security
- **PII Protection**: Automatic redaction of sensitive information
- **CORS Configuration**: Controlled cross-origin resource sharing
- **Network Isolation**: Services communicate through private networks
- **SSL/TLS**: Encrypted communication for external traffic

### 5. Observability
- **Centralized Logging**: Structured logging across all services
- **Metrics Collection**: Prometheus for time-series metrics
- **Visualization**: Grafana dashboards for real-time monitoring
- **Distributed Tracing**: Request flow tracking across services

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Web Browser  │  │ Mobile App   │  │  LINE/Chat   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE LAYER (Nginx)                            │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  • SSL/TLS Termination                               │       │
│  │  • Load Balancing                                    │       │
│  │  • Rate Limiting                                     │       │
│  │  • Static Asset Serving                              │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   API        │  │    Worker    │  │   Model      │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  │  (FastAPI)   │  │   (Python)   │  │  (Optional)  │          │
│  │              │  │              │  │              │          │
│  │ • REST APIs  │  │ • Job Queue  │  │ • ML Models  │          │
│  │ • WebSocket  │  │ • AI Logic   │  │ • Inference  │          │
│  │ • Validation │  │ • NLP/ML     │  │ • Training   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED LAYER (Common)                         │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  • Knowledge Base       • PII Redaction              │       │
│  │  • Retrieval Engine     • Prompt Engineering         │       │
│  │  • Language Detection   • Response Generation        │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   Redis      │  │  PostgreSQL  │                             │
│  │  (Cache &    │  │  (Persistent │                             │
│  │   Pub/Sub)   │  │   Storage)   │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OBSERVABILITY LAYER                             │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  Prometheus  │  │   Grafana    │                             │
│  │  (Metrics)   │  │ (Dashboards) │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
cblue-ai/
│
├── common/                          # Shared Business Logic Layer
│   ├── __init__.py                 # Package initialization
│   ├── knowledge_base.py           # Knowledge repository & semantic matching
│   ├── pii_redaction.py            # PII detection & redaction engine
│   ├── prompts.py                  # AI prompt engineering & templates
│   └── retrieval.py                # Hybrid retrieval system (semantic + keyword)
│
├── services/                        # Microservices Layer
│   │
│   ├── api/                        # REST API Service
│   │   ├── Dockerfile              # Container image definition
│   │   ├── main.py                 # FastAPI application entry point
│   │   ├── requirements.txt        # Python dependencies
│   │   └── venv/                   # Virtual environment (dev only)
│   │
│   ├── worker/                     # Background Job Processor
│   │   ├── worker.py               # Job queue consumer & AI processing
│   │   ├── requirements.txt        # Python dependencies
│   │   └── worker.log              # Service logs
│   │
│   └── model_service/              # ML Model Service (Optional)
│       ├── run.py                  # Model inference server
│       └── requirements.txt        # ML framework dependencies
│
├── frontend/                        # Presentation Layer
│   ├── index.html                  # Main landing page
│   ├── style.css                   # Styling & responsive design
│   ├── script.js                   # Client-side JavaScript
│   ├── chatbot-integration.js      # Chatbot widget integration
│   ├── app.py                      # Frontend web server (Flask)
│   ├── *.jpg, *.png                # Static assets & images
│   └── venv/                       # Virtual environment (dev only)
│
├── infra/                          # Infrastructure as Code
│   ├── nginx.conf                  # Nginx reverse proxy configuration (dev)
│   ├── nginx-production.conf       # Production Nginx configuration
│   ├── prometheus.yml              # Metrics collection configuration
│   └── cblue-api.service           # Systemd service definition
│
├── logs/                           # Centralized Logging
│   ├── api.log                     # API service logs
│   ├── frontend.log                # Frontend service logs
│   ├── worker.log                  # Worker service logs
│   ├── api.pid                     # API process ID
│   ├── frontend.pid                # Frontend process ID
│   └── worker.pid                  # Worker process ID
│
├── docker-compose.yml              # Multi-container orchestration
├── render.yaml                     # Render.com deployment configuration
│
├── package.json                    # Node.js project metadata (if applicable)
├── package-lock.json               # Locked dependency versions
│
├── test_chat.py                    # Integration tests for chat functionality
├── test_green_construction.py      # Domain-specific tests
│
├── DEPLOYMENT.md                   # Deployment procedures & runbooks
├── FREE-DEPLOYMENT.md              # Free-tier deployment guide
└── ARCHITECTURE.md                 # This document

```

### Folder Structure Explanation

#### **`/common`** - Shared Business Logic
Contains reusable components used across multiple services. This promotes DRY (Don't Repeat Yourself) principles and ensures consistency.

- **knowledge_base.py**: Central knowledge repository with semantic matching
- **pii_redaction.py**: Privacy protection mechanisms
- **prompts.py**: AI prompt templates for consistent responses
- **retrieval.py**: Hybrid search combining semantic and keyword matching

#### **`/services`** - Microservices
Each subdirectory represents an independent, deployable service:

- **api/**: Handles HTTP requests, input validation, and client communication
- **worker/**: Processes AI jobs asynchronously, preventing API blocking
- **model_service/**: Optional ML inference service for custom models

#### **`/frontend`** - User Interface
Static files and client-side application:

- HTML/CSS/JS for responsive web interface
- Chatbot widget integration scripts
- Flask-based development server

#### **`/infra`** - Infrastructure Configuration
Infrastructure as Code (IaC) for reproducible deployments:

- Nginx configurations for different environments
- Monitoring stack configuration
- Service management scripts

#### **`/logs`** - Centralized Logging
Structured logging for debugging and auditing:

- Separate log files per service
- PID files for process management

---

## Component Architecture

### 1. API Service (services/api/)

**Technology Stack**: FastAPI, Python 3.9+, Uvicorn

**Responsibilities**:
- Handle incoming HTTP requests
- Validate and sanitize input
- Route requests to appropriate handlers
- Return responses to clients
- Manage CORS policies

**Key Components**:

```python
# main.py structure
┌─────────────────────────────────┐
│       FastAPI Application       │
├─────────────────────────────────┤
│  Middleware:                    │
│   • CORS                        │
│   • Request Logging             │
│   • Error Handling              │
├─────────────────────────────────┤
│  Endpoints:                     │
│   • POST /chat                  │
│   • GET  /health                │
│   • GET  /metrics (future)      │
├─────────────────────────────────┤
│  Business Logic:                │
│   • Query Processing            │
│   • Language Detection          │
│   • Response Generation         │
│   • Knowledge Base Integration  │
└─────────────────────────────────┘
```

**API Flow**:
```
Client Request → CORS Validation → Input Validation → 
Language Detection → Knowledge Base Query → 
Response Generation → Logging → Client Response
```

**Scalability Features**:
- Stateless design for horizontal scaling
- Async/await for non-blocking I/O
- Connection pooling for database access
- Health check endpoints for load balancer integration

### 2. Worker Service (services/worker/)

**Technology Stack**: Python 3.9+, Redis, Socket Programming

**Responsibilities**:
- Consume jobs from Redis queue
- Process AI/NLP tasks asynchronously
- Communicate with ML model service
- Publish results back to Redis channels

**Key Components**:

```python
# worker.py structure
┌─────────────────────────────────┐
│        Worker Process           │
├─────────────────────────────────┤
│  Job Queue Consumer:            │
│   • Redis Pub/Sub Listener      │
│   • Job Deserialization         │
├─────────────────────────────────┤
│  Processing Pipeline:           │
│   • Language Detection          │
│   • PII Redaction               │
│   • Context Retrieval           │
│   • Prompt Building             │
│   • Model Inference             │
│   • Response Post-processing    │
├─────────────────────────────────┤
│  Result Publisher:              │
│   • Redis Channel Publish       │
│   • Error Handling              │
└─────────────────────────────────┘
```

**Worker Flow**:
```
Redis Queue → Job Parsing → PII Detection → 
Knowledge Retrieval → Prompt Engineering → 
Model Call → Response Extraction → 
Redis Publish → Logging
```

**Reliability Features**:
- Graceful error handling with fallback responses
- Job retry mechanisms (future enhancement)
- Dead letter queue for failed jobs (future enhancement)
- Circuit breaker for model service calls

### 3. Model Service (services/model_service/)

**Technology Stack**: Python, Socket Server, ML Frameworks (TensorFlow/PyTorch)

**Responsibilities**:
- Load and serve ML models
- Handle inference requests
- Manage model lifecycle
- Optimize inference performance

**Deployment Notes**:
- Currently optional; can use external AI services
- Unix socket communication for low latency
- Can be replaced with REST API for distributed deployment

### 4. Common Libraries (common/)

**Knowledge Base Module** (`knowledge_base.py`):
```python
Features:
├── Multilingual Content Repository
├── Keyword-based Matching
├── Language Detection (EN, TH, ZH)
├── Content Extraction by Language
└── Fallback Response Generation
```

**PII Redaction Module** (`pii_redaction.py`):
```python
Features:
├── Email Detection
├── Phone Number Detection
├── ID Card Number Detection
├── Custom Pattern Matching
└── Redaction with Placeholder
```

**Retrieval Module** (`retrieval.py`):
```python
Features:
├── Hybrid Search (Semantic + Keyword)
├── Vector Embeddings
├── Similarity Scoring
└── Result Ranking
```

**Prompts Module** (`prompts.py`):
```python
Features:
├── RAG Prompt Templates
├── Language-specific Instructions
├── Context Injection
└── Fallback Message Generation
```

### 5. Frontend Application (frontend/)

**Technology Stack**: HTML5, CSS3, Vanilla JavaScript, Flask (dev server)

**Components**:

```
Frontend Architecture
├── index.html (Structure)
│   ├── Hero Section
│   ├── Services Grid
│   ├── About Section
│   ├── Contact Form
│   └── Footer
│
├── style.css (Presentation)
│   ├── Responsive Design
│   ├── Mobile-first Approach
│   ├── CSS Grid Layout
│   └── Custom Animations
│
├── script.js (Client Logic)
│   ├── Form Validation
│   ├── Smooth Scrolling
│   └── Interactive Elements
│
└── chatbot-integration.js (Widget)
    ├── Chat UI Rendering
    ├── WebSocket Communication
    ├── Message History
    └── Typing Indicators
```

---

## Data Architecture

### Data Models

#### Chat Conversation
```python
{
  "conversation_id": "uuid-v4",
  "user_message": "string",
  "bot_response": "string",
  "language": "en|th|zh",
  "timestamp": "ISO-8601",
  "metadata": {
    "detected_topics": ["topic1", "topic2"],
    "pii_detected": boolean,
    "response_time_ms": integer
  }
}
```

#### Knowledge Base Entry
```python
{
  "topic_id": "string",
  "keywords": ["keyword1", "keyword2", ...],
  "content": {
    "en": "English content",
    "th": "Thai content",
    "zh": "Chinese content"
  },
  "category": "string",
  "tags": ["tag1", "tag2", ...]
}
```

### Data Flow

```
User Query → API Service → Redis Pub/Sub → Worker Service
                ↓                             ↓
          Quick Response              Knowledge Base
                ↓                             ↓
           (or wait)                    AI Processing
                ↓                             ↓
          Redis Channel ← Publish Result ← Worker
                ↓
          WebSocket/HTTP → Client
```

### Data Storage

#### Redis (In-Memory Data Store)
- **Purpose**: Message queue, pub/sub, caching
- **Data Types**: Strings, Lists, Pub/Sub channels
- **Persistence**: AOF (Append-Only File) for durability
- **Use Cases**:
  - Job queue for async processing
  - Real-time pub/sub messaging
  - Session data caching
  - Rate limiting counters

#### PostgreSQL (Relational Database)
- **Purpose**: Persistent data storage
- **Schema**:
  ```sql
  -- Conversations table
  CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    language VARCHAR(5),
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
  );
  
  -- Analytics table
  CREATE TABLE analytics (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Users table (future)
  CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

---

## Infrastructure Architecture

### Container Architecture

```yaml
Docker Compose Stack:
├── nginx (Edge Layer)
│   ├── Port: 80, 443
│   ├── Volumes: /infra/nginx.conf
│   └── Depends: api
│
├── api (Application Layer)
│   ├── Port: 8000
│   ├── Environment: REDIS_URL, DATABASE_URL
│   └── Depends: redis, postgres
│
├── worker (Background Processing)
│   ├── Environment: REDIS_URL
│   └── Depends: redis
│
├── redis (Data Layer)
│   ├── Port: 6379
│   ├── Volumes: redis_data:/data
│   └── Persistence: AOF enabled
│
├── postgres (Data Layer)
│   ├── Port: 5432
│   ├── Volumes: postgres_data:/var/lib/postgresql/data
│   └── Credentials: Environment variables
│
├── prometheus (Monitoring)
│   ├── Port: 9090
│   └── Volumes: /infra/prometheus.yml
│
└── grafana (Visualization)
    ├── Port: 3000
    └── Depends: prometheus
```

### Network Architecture

```
External Network (Internet)
          ↓
     [Firewall]
          ↓
     [Nginx - 80/443]
          ↓
  Internal Network (Docker Bridge)
          ↓
    ┌─────────────────┐
    │   API Service   │ (8000)
    └─────────────────┘
          ↓
    ┌─────────────────┐
    │  Worker Service │ (internal)
    └─────────────────┘
          ↓
    ┌─────────────────────────────┐
    │  Redis (6379)  PostgreSQL   │
    │                 (5432)       │
    └─────────────────────────────┘
```

**Security Zones**:
- **Public Zone**: Nginx (ports 80, 443)
- **Application Zone**: API, Worker (no public access)
- **Data Zone**: Redis, PostgreSQL (no public access)
- **Monitoring Zone**: Prometheus, Grafana (optional public access)

---

## Security Architecture

### Defense in Depth

#### Layer 1: Edge Security (Nginx)
- SSL/TLS encryption (HTTPS)
- Rate limiting per IP
- Request size limits
- DDoS protection (via Cloudflare/CDN)
- HTTP security headers:
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-Content-Type-Options "nosniff";
  add_header X-XSS-Protection "1; mode=block";
  add_header Strict-Transport-Security "max-age=31536000";
  ```

#### Layer 2: Application Security
- **CORS Policy**: Whitelist trusted origins
- **Input Validation**: Pydantic models for request validation
- **Output Encoding**: Prevent XSS attacks
- **PII Protection**: Automatic redaction of sensitive data
- **SQL Injection Prevention**: Parameterized queries with ORMs

#### Layer 3: Data Security
- **Encryption at Rest**: Database volume encryption
- **Encryption in Transit**: TLS for all inter-service communication
- **Access Control**: Database credentials via environment variables
- **Secrets Management**: Use secrets manager (AWS Secrets Manager, HashiCorp Vault)

#### Layer 4: Network Security
- **Firewall Rules**: Only expose necessary ports
- **Network Segmentation**: Isolated Docker networks
- **Private Subnets**: Database in private network only
- **VPN Access**: Admin access via VPN

### Authentication & Authorization (Future Enhancement)

```python
# Recommended implementation
JWT-based Authentication:
├── User Registration/Login
├── Token Generation (Access + Refresh)
├── Token Validation Middleware
├── Role-Based Access Control (RBAC)
└── API Key Management for B2B
```

---

## Deployment Architecture

### Development Environment

```bash
# Local development setup
docker-compose up -d
# All services run on localhost
# - Frontend: http://localhost:80
# - API: http://localhost:8000
# - Grafana: http://localhost:3000
# - Prometheus: http://localhost:9090
```

### Staging Environment

```
Architecture:
├── Cloud Provider: Render.com / AWS / GCP
├── Services:
│   ├── Web Service (Frontend)
│   ├── Web Service (API)
│   ├── Background Worker
│   ├── Managed Redis (Redis Cloud)
│   └── Managed PostgreSQL (RDS / Cloud SQL)
├── CI/CD: GitHub Actions
└── Monitoring: Prometheus + Grafana Cloud
```

### Production Environment

**High-Availability Architecture**:

```
┌─────────────────────────────────────────────┐
│           Load Balancer (CDN)               │
│         (Cloudflare / AWS ALB)              │
└─────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  Nginx 1     │     │  Nginx 2     │
│  (Zone A)    │     │  (Zone B)    │
└──────────────┘     └──────────────┘
         │                    │
         ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  API Pod 1   │     │  API Pod 2   │
│  API Pod 3   │     │  API Pod 4   │
└──────────────┘     └──────────────┘
         │                    │
         └──────────┬─────────┘
                    ▼
         ┌──────────────────────┐
         │   Redis Cluster      │
         │   (Multi-AZ)         │
         └──────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  PostgreSQL Primary  │
         │  + Read Replicas     │
         │  (Multi-AZ)          │
         └──────────────────────┘
```

**Deployment Platforms**:

1. **Cloud Native (Kubernetes)**:
   ```yaml
   Components:
   - Kubernetes Cluster (EKS/GKE/AKS)
   - Ingress Controller (Nginx/Traefik)
   - HPA (Horizontal Pod Autoscaler)
   - Helm Charts for deployment
   - ArgoCD for GitOps
   ```

2. **Platform as a Service (Render.com)**:
   ```yaml
   # render.yaml
   services:
     - type: web
       name: cblue-api
       env: python
       buildCommand: pip install -r requirements.txt
       startCommand: uvicorn main:app --host 0.0.0.0
       
     - type: worker
       name: cblue-worker
       env: python
       startCommand: python worker.py
   ```

3. **Traditional VM (AWS EC2 / DigitalOcean)**:
   - Ansible playbooks for configuration management
   - Systemd for service management
   - Docker Compose for orchestration

---

## Integration Architecture

### External Integrations

#### 1. Messaging Platforms
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   LINE API   │────▶│  Webhook     │────▶│  API Service │
└──────────────┘     │  Adapter     │     └──────────────┘
                     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ WhatsApp API │────▶│  Webhook     │────▶│  API Service │
└──────────────┘     │  Adapter     │     └──────────────┘
                     └──────────────┘
```

#### 2. AI/ML Services
```
┌──────────────┐     ┌──────────────┐
│   OpenAI     │◀───▶│   Worker     │
│   API        │     │   Service    │
└──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐
│   Google     │◀───▶│   Worker     │
│   Cloud AI   │     │   Service    │
└──────────────┘     └──────────────┘
```

#### 3. Analytics & Monitoring
```
┌──────────────┐     ┌──────────────┐
│  Google      │◀───▶│   Frontend   │
│  Analytics   │     │   / API      │
└──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐
│  Sentry      │◀───▶│  All         │
│  (Error      │     │  Services    │
│   Tracking)  │     │              │
└──────────────┘     └──────────────┘
```

### API Integration Patterns

```python
# Webhook Integration
@app.post("/webhooks/line")
async def line_webhook(request: LineWebhookRequest):
    # Verify webhook signature
    # Process LINE message
    # Send to internal API
    pass

# REST API Integration
class ExternalAPIClient:
    async def call_ai_service(self, prompt: str):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.external.com/generate",
                json={"prompt": prompt},
                headers={"Authorization": f"Bearer {API_KEY}"}
            )
            return response.json()
```

---

## Monitoring & Observability

### Metrics Collection (Prometheus)

**Key Metrics**:

```yaml
Application Metrics:
  - http_requests_total (counter)
  - http_request_duration_seconds (histogram)
  - active_connections (gauge)
  - job_queue_length (gauge)
  - job_processing_duration (histogram)
  - ai_model_inference_time (histogram)

System Metrics:
  - cpu_usage_percent
  - memory_usage_bytes
  - disk_io_operations
  - network_bytes_sent/received

Business Metrics:
  - conversations_total (by language)
  - topics_requested (by category)
  - user_satisfaction_score
  - response_accuracy_rate
```

### Logging Strategy

**Structured Logging (JSON)**:
```json
{
  "timestamp": "2025-10-28T14:00:00Z",
  "level": "INFO",
  "service": "api",
  "trace_id": "abc-123-def",
  "message": "Chat request processed",
  "context": {
    "conversation_id": "conv-456",
    "language": "en",
    "response_time_ms": 250,
    "topic_detected": "solar"
  }
}
```

**Log Levels**:
- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARNING**: Unexpected but handled situations
- **ERROR**: Error events that might still allow operation
- **CRITICAL**: Serious errors causing system failure

**Log Aggregation**:
```
Services → FluentD/Filebeat → Elasticsearch → Kibana
            (or)
Services → CloudWatch Logs → CloudWatch Insights
```

### Alerting

**Alert Rules (Prometheus Alertmanager)**:

```yaml
groups:
  - name: cblue_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High 5xx error rate"
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        annotations:
          summary: "95th percentile response time > 2s"
          
      - alert: ServiceDown
        expr: up{job="api"} == 0
        for: 1m
        annotations:
          summary: "API service is down"
```

### Dashboards (Grafana)

**Dashboard Categories**:

1. **System Overview**:
   - Service health status
   - Request rate
   - Error rate
   - Response time percentiles

2. **Application Performance**:
   - API endpoint performance
   - Worker job processing time
   - Cache hit/miss rates
   - Database query performance

3. **Business Metrics**:
   - Conversations per day
   - Language distribution
   - Topic popularity
   - User engagement

4. **Infrastructure**:
   - CPU/Memory usage
   - Network I/O
   - Disk usage
   - Container health

---

## Scalability & Performance

### Horizontal Scaling Strategy

```yaml
Component         Current    Target (10k users)    Strategy
─────────────────────────────────────────────────────────────
API Service       1 pod      10-20 pods            Auto-scale on CPU/Memory
Worker Service    1 pod      5-10 pods             Auto-scale on queue length
Redis             1 node     3-node cluster        Redis Cluster
PostgreSQL        1 instance Read replicas         Master + 2 replicas
Nginx             1 instance 2+ instances          Load balancer
```

### Performance Optimization

#### 1. Caching Strategy
```python
# Multi-level caching
L1: In-memory LRU cache (per service)
L2: Redis cache (shared)
L3: Database query optimization

# Cache TTL strategy
- Knowledge base: 1 hour
- User sessions: 30 minutes
- Static content: 24 hours
```

#### 2. Database Optimization
```sql
-- Indexes
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX idx_conversations_language ON conversations(language);

-- Partitioning (for large tables)
CREATE TABLE conversations (
  ...
) PARTITION BY RANGE (created_at);

-- Read replicas
- Write: Primary
- Read: Replica pool (round-robin)
```

#### 3. Asynchronous Processing
```python
# Non-blocking operations
- Use async/await for I/O operations
- Background job queue for heavy tasks
- WebSocket for real-time updates
- Server-sent events for notifications
```

### Load Testing

**Tools**: Locust, JMeter, k6

**Test Scenarios**:
```python
# Scenario 1: Normal load
- 100 concurrent users
- 10 requests/second
- Target: < 500ms p95

# Scenario 2: Peak load
- 1000 concurrent users
- 100 requests/second
- Target: < 1s p95

# Scenario 3: Stress test
- Gradually increase to 10,000 users
- Find breaking point
- Verify graceful degradation
```

---

## Disaster Recovery & Business Continuity

### Backup Strategy

```yaml
Component: PostgreSQL
  Frequency: Daily full + hourly incremental
  Retention: 30 days
  Location: S3 / Cloud Storage (multi-region)
  Restore Time: < 1 hour
  
Component: Redis
  Frequency: Every 6 hours (AOF)
  Retention: 7 days
  Location: Same as PostgreSQL
  Restore Time: < 15 minutes

Component: Application Code
  Frequency: Continuous (Git)
  Retention: Indefinite
  Location: GitHub
  Restore Time: < 5 minutes
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective)**: 1 hour
**RPO (Recovery Point Objective)**: 1 hour

**Failover Scenarios**:

1. **Database Failure**:
   ```
   Primary DB fails → Promote read replica → 
   Update connection strings → Verify integrity
   ```

2. **Service Failure**:
   ```
   Service crashes → Health check fails → 
   Load balancer removes → Auto-scale launches new pod
   ```

3. **Region Failure**:
   ```
   Primary region down → Route traffic to secondary region → 
   Restore from backups → Verify data consistency
   ```

### High Availability Checklist

- [ ] Multi-AZ deployment
- [ ] Database replication (master-slave)
- [ ] Load balancer health checks
- [ ] Auto-scaling policies
- [ ] Automated backups (tested monthly)
- [ ] Disaster recovery drills (quarterly)
- [ ] Incident response playbook
- [ ] 24/7 monitoring and alerting

---

## Best Practices & Recommendations

### Code Quality

1. **Follow PEP 8**: Python style guide
2. **Type Hints**: Use Python type annotations
3. **Docstrings**: Document all public functions
4. **Unit Tests**: > 80% code coverage
5. **Code Reviews**: Mandatory PR reviews
6. **Linting**: flake8, pylint, black
7. **Static Analysis**: mypy, bandit (security)

### Development Workflow

```
Feature Branch → Development → Code Review → 
Staging → QA Testing → Production
```

### CI/CD Pipeline

```yaml
GitHub Actions Workflow:
1. Trigger: Push to main/develop
2. Lint: flake8, black
3. Test: pytest with coverage
4. Build: Docker image
5. Scan: Trivy (security scan)
6. Deploy: 
   - Staging (auto)
   - Production (manual approval)
7. Verify: Smoke tests
8. Notify: Slack/Email
```

### Security Best Practices

- [ ] Regular dependency updates
- [ ] Vulnerability scanning (Snyk, Dependabot)
- [ ] Secrets rotation (quarterly)
- [ ] Security audits (annual)
- [ ] OWASP Top 10 compliance
- [ ] Penetration testing (annual)
- [ ] Employee security training

### Operational Excellence

- [ ] Infrastructure as Code (Terraform/CloudFormation)
- [ ] Configuration management (Ansible/Chef)
- [ ] Immutable infrastructure
- [ ] Blue-green deployments
- [ ] Canary releases
- [ ] Feature flags
- [ ] Chaos engineering (production testing)

---

## Future Enhancements

### Planned Features

1. **Authentication & Authorization**
   - User registration/login
   - OAuth2 integration
   - Role-based access control

2. **Advanced Analytics**
   - User behavior tracking
   - Conversation insights
   - A/B testing framework

3. **Multi-tenancy**
   - White-label solution
   - Tenant isolation
   - Custom branding

4. **Enhanced AI Capabilities**
   - Context-aware conversations
   - Sentiment analysis
   - Voice input/output

5. **Integration Expansion**
   - Facebook Messenger
   - Telegram
   - Slack
   - Microsoft Teams

6. **Developer Portal**
   - API documentation
   - SDKs (Python, JavaScript, Go)
   - Sandbox environment

---

## Conclusion

This architecture document provides a comprehensive blueprint for the Cblue AI platform. The design emphasizes:

- **Scalability**: Horizontal scaling for all components
- **Reliability**: Redundancy and fault tolerance
- **Security**: Defense in depth
- **Maintainability**: Clean code and modular design
- **Observability**: Comprehensive monitoring and logging

The architecture is designed to evolve with business needs while maintaining operational excellence and delivering exceptional user experiences.

---

## Document Metadata

- **Version**: 1.0.0
- **Last Updated**: 2025-10-28
- **Authors**: Cblue AI Architecture Team
- **Review Cycle**: Quarterly
- **Next Review**: 2026-01-28

## Contact

For questions or clarifications about this architecture:
- **Email**: cblue.thailand@gmail.com
- **Phone**: +66 (0)81 854 4291
- **Website**: [Your website URL]

---

**End of Architecture Document**
