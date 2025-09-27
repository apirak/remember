// Simple Firestore Operation Counter
// นับจำนวนครั้งที่เรียก Firestore APIs แบบง่ายๆ

class SimpleFirestoreCounter {
  private totalReads: number = 0;
  private totalWrites: number = 0;
  private enabled: boolean = true; // เปิดโดย default

  // เปิด/ปิดการนับ
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`🔍 Firestore counter: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // เช็คว่าเปิดอยู่ไหม
  isEnabled(): boolean {
    return this.enabled;
  }

  // นับ read operation
  countRead(): void {
    this.totalReads++;
    console.log(`📖 READ #${this.totalReads}`);
  }

  // นับ write operation
  countWrite(): void {
    this.totalWrites++;
    console.log(`✍️ WRITE #${this.totalWrites}`);
  }

  // ดูสถิติ
  getStats(): { totalReads: number; totalWrites: number; totalOps: number } {
    return {
      totalReads: this.totalReads,
      totalWrites: this.totalWrites,
      totalOps: this.totalReads + this.totalWrites,
    };
  }

  // เคลียร์ข้อมูล
  clear(): void {
    this.totalReads = 0;
    this.totalWrites = 0;
    console.log('🗑️ Counter cleared');
  }
}

// สร้าง global instance
export const firestoreCounter = new SimpleFirestoreCounter();

// Helper functions สำหรับ console (เฉพาะ browser)
if (typeof window !== 'undefined') {
  (window as any).firestoreDebug = {
    enable: () => firestoreCounter.setEnabled(true),
    disable: () => firestoreCounter.setEnabled(false),
    getStats: () => firestoreCounter.getStats(),
    clear: () => firestoreCounter.clear(),
    reset: () => firestoreCounter.clear(),
  };
}

console.log(
  '🔍 Firestore Debug: Use window.firestoreDebug.enable() to start counting'
);
