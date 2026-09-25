import { describe, expect, it } from "vitest";
import {
  addDays,
  blankMoneyToNull,
  blankMoneyToZero,
  intervalPeriodContaining,
  normalizeLoanPaidOff,
  normalizeRentFrequency,
  normalizeRepairStatus,
  noteSaveError,
  propertySaveError,
  recommendedRemoval,
  remainingRent,
  rentPeriodStatus,
  repairSaveError,
  summarizePeriod,
  summarizeVisiblePeriods,
  unpaidForDashboard,
  type RentPaymentInput,
  type RentScheduleInput,
} from "./rentSchedule";

const monthly: RentScheduleInput = {
  frequency: "monthly",
  expectedAmount: 1000,
  dueDay: 1,
  anchorDate: "",
  intervalDays: null,
};

function pay(partial: Partial<RentPaymentInput> & Pick<RentPaymentInput, "id" | "date" | "amount">): RentPaymentInput {
  return {
    type: "payment",
    applyTo: "Rent",
    rentPeriodStart: "",
    rentPeriodEnd: "",
    voidedAt: "",
    ...partial,
  };
}

describe("rent frequencies", () => {
  it("builds weekly periods of 7 days from the anchor", () => {
    const period = intervalPeriodContaining("2026-01-05", 7, "2026-01-05", 250);
    expect(period.start).toBe("2026-01-05");
    expect(period.end).toBe("2026-01-11");
    expect(addDays(period.start, 7)).toBe("2026-01-12");
  });

  it("builds bi-weekly periods of 14 days", () => {
    const period = intervalPeriodContaining("2026-01-05", 14, "2026-01-20", 500);
    expect(period.start).toBe("2026-01-19");
    expect(period.end).toBe("2026-02-01");
    expect(addDays(period.start, 14)).toBe("2026-02-02");
  });

  it("builds a monthly period around the due day without requiring the payment date to match", () => {
    const [march] = summarizeVisiblePeriods(monthly, [], "2026-03-12").filter((p) => p.start === "2026-03-01");
    expect(march.end).toBe("2026-03-31");
    expect(march.dueDate).toBe("2026-03-01");
    expect(march.expected).toBe(1000);
  });

  it("supports a custom number of days", () => {
    const period = intervalPeriodContaining("2026-03-01", 10, "2026-03-01", 300);
    expect(period.end).toBe("2026-03-10");
  });

  it("treats a missing frequency as monthly so older properties still load", () => {
    expect(normalizeRentFrequency(undefined)).toBe("monthly");
    expect(normalizeRentFrequency("weekly")).toBe("weekly");
  });
});

describe("rent payments", () => {
  const march = {
    start: "2026-03-01",
    end: "2026-03-31",
    dueDate: "2026-03-01",
    expected: 1000,
  };

  it("keeps a partial payment and shows the remaining amount", () => {
    const summary = summarizePeriod(march, [pay({ id: "a", date: "2026-03-01", amount: 400 })], "2026-03-12");
    expect(summary.received).toBe(400);
    expect(summary.remaining).toBe(600);
    expect(summary.status).toBe("Partial");
    expect(remainingRent(1000, 400)).toBe(600);
  });

  it("adds multiple payments toward one period and marks it paid", () => {
    const summary = summarizePeriod(
      march,
      [
        pay({ id: "a", date: "2026-03-01", amount: 400, rentPeriodStart: "2026-03-01", rentPeriodEnd: "2026-03-31" }),
        pay({ id: "b", date: "2026-03-12", amount: 600, rentPeriodStart: "2026-03-01", rentPeriodEnd: "2026-03-31" }),
      ],
      "2026-03-12"
    );
    expect(summary.received).toBe(1000);
    expect(summary.remaining).toBe(0);
    expect(summary.status).toBe("Paid");
    expect(summary.paymentIds).toEqual(["a", "b"]);
  });

  it("counts a payment whose date is not the due date when it is assigned to the period", () => {
    const summary = summarizePeriod(
      march,
      [pay({ id: "late", date: "2026-04-02", amount: 1000, rentPeriodStart: "2026-03-01", rentPeriodEnd: "2026-03-31" })],
      "2026-04-02"
    );
    expect(summary.received).toBe(1000);
    expect(summary.status).toBe("Paid");
    expect(rentPeriodStatus(1000, 0, "2026-03-31", "2026-04-02")).toBe("Overdue");
  });

  it("does not require the payment to equal the scheduled rent", () => {
    const summary = summarizePeriod(
      march,
      [pay({ id: "over", date: "2026-03-03", amount: 1200, rentPeriodStart: "2026-03-01", rentPeriodEnd: "2026-03-31" })],
      "2026-03-03"
    );
    expect(summary.status).toBe("Overpaid");
    expect(summary.remaining).toBe(0);
  });

  it("leaves an assigned payment out of a different period even if the date falls there", () => {
    const april = { start: "2026-04-01", end: "2026-04-30", dueDate: "2026-04-01", expected: 1000 };
    const early = pay({
      id: "early",
      date: "2026-03-28",
      amount: 1000,
      rentPeriodStart: "2026-04-01",
      rentPeriodEnd: "2026-04-30",
    });
    expect(summarizePeriod(march, [early], "2026-03-28").received).toBe(0);
    expect(summarizePeriod(april, [early], "2026-03-28").status).toBe("Paid");
  });

  it("ignores a voided payment", () => {
    const summary = summarizePeriod(
      march,
      [pay({ id: "void", date: "2026-03-01", amount: 1000, voidedAt: "2026-03-02T00:00:00Z" })],
      "2026-03-05"
    );
    expect(summary.received).toBe(0);
    expect(summary.status).toBe("Unpaid");
  });
});

describe("repairs, notes, reminders, and loans", () => {
  it("allows a repair to be saved with no price", () => {
    expect(
      repairSaveError({
        title: "Replace back porch railing",
        description: "",
        actualCost: "",
        estimatedCost: "",
      })
    ).toBeNull();
    expect(blankMoneyToZero("")).toBe(0);
    expect(blankMoneyToNull("")).toBeNull();
  });

  it("still rejects a repair that has no description at all", () => {
    expect(repairSaveError({ title: "", description: "  ", actualCost: "", estimatedCost: "" })).toMatch(/repair/i);
  });

  it("requires note text and treats notes as deletable rather than voided", () => {
    expect(noteSaveError("")).toMatch(/note/i);
    expect(noteSaveError("Call tenant")).toBeNull();
    expect(recommendedRemoval("note")).toBe("delete");
    expect(recommendedRemoval("reminder")).toBe("delete");
    expect(recommendedRemoval("repair")).toBe("delete");
    expect(recommendedRemoval("payment")).toBe("void");
  });

  it("saves a property with an unpaid loan when only some loan fields are known", () => {
    expect(
      propertySaveError({
        propertyName: "Oak Street",
        frequency: "monthly",
        rentIntervalDays: "",
      })
    ).toBeNull();
    expect(normalizeLoanPaidOff(false)).toBe(false);
  });

  it("treats a missing loan flag as paid off so older properties stay compatible", () => {
    expect(normalizeLoanPaidOff(undefined)).toBe(true);
    expect(normalizeLoanPaidOff(true)).toBe(true);
    expect(normalizeRepairStatus(undefined)).toBe("Completed");
    expect(normalizeRepairStatus("Waiting on Funds")).toBe("Waiting on Funds");
  });
});

describe("existing ledger records", () => {
  it("keeps unpaid rent on the old charge balance when a property already has charges", () => {
    const due = unpaidForDashboard({
      schedule: monthly,
      today: "2026-03-12",
      transactions: [
        {
          id: "charge",
          type: "charge",
          applyTo: "Rent",
          date: "2026-01-01",
          chargeAmount: 1000,
          paymentAmount: 0,
          rentPeriodStart: "",
          rentPeriodEnd: "",
          voidedAt: "",
        },
        {
          id: "pay",
          type: "payment",
          applyTo: "Rent",
          date: "2026-03-01",
          chargeAmount: 0,
          paymentAmount: 400,
          rentPeriodStart: "",
          rentPeriodEnd: "",
          voidedAt: "",
        },
      ],
    });
    expect(due).toBe(600);
  });

  it("starts a two-week schedule on payday and keeps the other share still due", () => {
    const schedule: RentScheduleInput = {
      frequency: "biweekly",
      expectedAmount: 400,
      dueDay: 1,
      anchorDate: "2026-09-23",
      intervalDays: null,
      leaseStart: "2026-09-11",
    };
    const periods = summarizeVisiblePeriods(
      schedule,
      [
        pay({
          id: "chris",
          date: "2026-09-23",
          amount: 300,
          rentPeriodStart: "2026-09-23",
          rentPeriodEnd: "2026-10-06",
        }),
      ],
      "2026-09-25"
    );
    expect(periods.some((p) => p.end < "2026-09-23")).toBe(false);
    const current = periods.find((p) => p.start === "2026-09-23");
    expect(current?.received).toBe(300);
    expect(current?.remaining).toBe(100);
    expect(current?.status).toBe("Partial");
    const upcoming = periods.find((p) => p.start === "2026-10-07");
    expect(upcoming?.status).toBe("Upcoming");
    expect(
      unpaidForDashboard({
        schedule,
        today: "2026-09-25",
        transactions: [
          {
            id: "old",
            type: "charge",
            applyTo: "Rent",
            date: "2026-09-24",
            chargeAmount: 1000,
            paymentAmount: 0,
            rentPeriodStart: "",
            rentPeriodEnd: "",
            voidedAt: "2026-09-25T00:00:00Z",
          },
          {
            id: "chris",
            type: "payment",
            applyTo: "Rent",
            date: "2026-09-23",
            chargeAmount: 0,
            paymentAmount: 300,
            rentPeriodStart: "2026-09-23",
            rentPeriodEnd: "2026-10-06",
            voidedAt: "",
          },
        ],
      })
    ).toBe(100);
  });

  it("uses the current rent period when there is no charge history", () => {
    const due = unpaidForDashboard({
      schedule: monthly,
      today: "2026-03-12",
      transactions: [
        {
          id: "pay",
          type: "payment",
          applyTo: "Rent",
          date: "2026-03-01",
          chargeAmount: 0,
          paymentAmount: 400,
          rentPeriodStart: "2026-03-01",
          rentPeriodEnd: "2026-03-31",
          voidedAt: "",
        },
      ],
    });
    expect(due).toBe(600);
  });
});
