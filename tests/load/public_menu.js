import http from "k6/http";
import { check } from "k6";

// Load test skala kecil sesuai PRD bagian 10: endpoint publik menu, target p95 < 300 ms.
const BASE = __ENV.BASE || "http://localhost:8000";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<300"],
  },
};

export default function () {
  const res = http.get(`${BASE}/public/meja-aresto/menu?table=T-01`);
  check(res, {
    "status 200": (r) => r.status === 200,
    "items ada": (r) => r.json("items") !== undefined,
  });
}
