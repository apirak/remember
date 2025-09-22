// Debug script for lazy card creation
// Run with console.log to see what's happening

console.log("🔍 Debugging lazy card creation...");

import("/src/services/flashcardService.ts")
  .then(async (module) => {
    const { FlashcardService } = module;

    const testCard = {
      id: "debug-001",
      front: {
        icon: "🔍",
        title: "调试",
        description: "Debug test",
      },
      back: {
        icon: "✅",
        title: "tiáoshì",
        description: "Debugging process",
      },
    };

    const progressData = {
      easinessFactor: 2.5,
      repetitions: 1,
      interval: 1,
      nextReviewDate: new Date(),
      lastReviewDate: new Date(),
      totalReviews: 1,
      correctStreak: 1,
      averageQuality: 4.0,
      isNew: false,
    };

    try {
      console.log("Testing saveCardWithProgress...");

      const result = await FlashcardService.saveCardWithProgress(
        testCard,
        "debug_card_set",
        progressData
      );

      console.log("Result:", {
        success: result.success,
        error: result.error,
        data: result.data,
      });

      if (!result.success) {
        console.error("❌ saveCardWithProgress failed:", result.error);
      } else {
        console.log("✅ saveCardWithProgress succeeded");

        // Try to load the card back
        console.log("Loading cards to verify...");
        const loadResult = await FlashcardService.loadUserFlashcards(
          "debug_card_set"
        );
        console.log("Load result:", {
          success: loadResult.success,
          cardCount: loadResult.data?.length,
          error: loadResult.error,
        });
      }
    } catch (error) {
      console.error("❌ Exception:", error);
    }
  })
  .catch((err) => {
    console.error("❌ Import failed:", err);
  });
