// Quick auth check test
import { describe, it, expect } from "vitest";
import { getCurrentUser } from "../../src/utils/auth";

describe("Auth Check", () => {
  it("should check if user is authenticated", () => {
    const user = getCurrentUser();
    console.log(
      "Current user:",
      user
        ? {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          }
        : "No user authenticated"
    );

    // This test will show us if authentication is working
    if (user) {
      expect(user.uid).toBeDefined();
      console.log("✅ User is authenticated");
    } else {
      console.log(
        "❌ No user authenticated - please sign in via web app first"
      );
      console.log("Go to: http://localhost:4322/db-test");
    }
  });
});
