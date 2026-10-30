import { describe, expect, it } from "vitest";
import { validatePhoto } from "@/lib/photos";

describe("photo rules", () => {
  it("accepts a 5 MB JPEG", () => expect(validatePhoto({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toBeNull());
  it("accepts PNG and WebP", () => {
    expect(validatePhoto({ type: "image/png", size: 1000 })).toBeNull();
    expect(validatePhoto({ type: "image/webp", size: 1000 })).toBeNull();
  });
  it("rejects files over 5 MB", () => expect(validatePhoto({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).not.toBeNull());
  it("rejects GIF and other types", () => {
    expect(validatePhoto({ type: "image/gif", size: 1000 })).not.toBeNull();
    expect(validatePhoto({ type: "application/pdf", size: 1000 })).not.toBeNull();
  });
});
