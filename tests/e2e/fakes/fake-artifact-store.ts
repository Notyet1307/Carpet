import { createHash } from "node:crypto";

import type { ProofArtifact } from "../../../packages/proof-ledger/src/index.ts";

export type StoredArtifact = ProofArtifact & {
  content: string;
};

export class FakeArtifactStore {
  readonly liveMemoryWrites: unknown[] = [];
  private readonly baseUri: string;
  private readonly records = new Map<string, StoredArtifact>();

  constructor(baseUri: string) {
    this.baseUri = baseUri.replace(/\/+$/, "");
  }

  putText(
    name: string,
    content: string,
    kind: ProofArtifact["kind"] = "report",
  ): ProofArtifact {
    return this.put(name, content, kind);
  }

  putJson(name: string, value: unknown, kind: ProofArtifact["kind"] = "report") {
    return this.put(name, `${JSON.stringify(value, null, 2)}\n`, kind);
  }

  get(uri: string) {
    return this.records.get(uri) ?? null;
  }

  list() {
    return [...this.records.values()];
  }

  private put(
    name: string,
    content: string,
    kind: ProofArtifact["kind"],
  ): ProofArtifact {
    const uri = `${this.baseUri}/${name}`;
    const artifact = {
      kind,
      uri,
      sha256: createHash("sha256").update(content).digest("hex"),
      content,
    };

    this.records.set(uri, artifact);

    return {
      kind: artifact.kind,
      uri: artifact.uri,
      sha256: artifact.sha256,
    };
  }
}
