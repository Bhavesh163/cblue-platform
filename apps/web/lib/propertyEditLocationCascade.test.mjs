import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../app/[locale]/fixers/page.tsx", import.meta.url),
  "utf8",
);

test("partner property edit uses the shared administrative location catalog", () => {
  assert.match(pageSource, /getThaiProvinces/);
  assert.match(pageSource, /getDistrictsForProvince/);
  assert.match(pageSource, /getSubdistrictsForDistrict/);
});

test("partner property edit renders a cascading province, district, and subdistrict form", () => {
  assert.match(pageSource, /<select[\s\S]+editing\.province/);
  assert.match(pageSource, /provinceOptions\.map/);
  assert.match(pageSource, /<select[\s\S]+editing\.district/);
  assert.match(pageSource, /getDistrictsForProvince\(String\(editing\.province/);
  assert.match(pageSource, /<select[\s\S]+editing\.subdistrict/);
  assert.match(
    pageSource,
    /getSubdistrictsForDistrict\([\s\S]+editing\.province[\s\S]+editing\.district/,
  );
});

test("changing a parent location clears its dependent selections", () => {
  assert.match(
    pageSource,
    /province: e\.target\.value,[\s\S]+district: "",[\s\S]+subdistrict: ""/,
  );
  assert.match(
    pageSource,
    /district: e\.target\.value,[\s\S]+subdistrict: ""/,
  );
});

test("dependent selects stay disabled until their parent selection exists", () => {
  assert.match(pageSource, /disabled=\{!editing\.province\}/);
  assert.match(pageSource, /disabled=\{!editing\.district\}/);
});
