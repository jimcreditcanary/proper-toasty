import { describe, expect, it } from "vitest";
import {
  classifyLocalPart,
  extractLocalPart,
  parseOfficerFirstName,
  pickPrimaryDirector,
  sanitiseFirstName,
  type OfficerLite,
} from "../first-name";

describe("extractLocalPart", () => {
  it("pulls the part before @ and lowercases it", () => {
    expect(extractLocalPart("James.Fell@example.com")).toBe("james.fell");
  });
  it("returns null when no @", () => {
    expect(extractLocalPart("james.fell")).toBeNull();
  });
  it("returns null on empty/nullish", () => {
    expect(extractLocalPart(null)).toBeNull();
    expect(extractLocalPart(undefined)).toBeNull();
    expect(extractLocalPart("")).toBeNull();
  });
  it("returns null on @-prefixed or @-suffixed garbage", () => {
    expect(extractLocalPart("@example.com")).toBeNull();
    expect(extractLocalPart("james@")).toBeNull();
  });
});

interface LocalPartCase {
  name: string;
  input: string;
  candidate: string | null;
  needsLlm: boolean;
  isRoleAccount: boolean;
}

const LOCAL_PART_CASES: LocalPartCase[] = [
  // — Confident delimited extractions —
  { name: "dotted first.last", input: "james.fell", candidate: "james", needsLlm: false, isRoleAccount: false },
  { name: "underscored first_last", input: "james_fell", candidate: "james", needsLlm: false, isRoleAccount: false },
  { name: "hyphenated first-last", input: "james-fell", candidate: "james", needsLlm: false, isRoleAccount: false },
  { name: "mixed-case input lowercases", input: "James.Fell", candidate: "james", needsLlm: false, isRoleAccount: false },
  { name: "three parts takes first", input: "james.q.fell", candidate: "james", needsLlm: false, isRoleAccount: false },
  // — Single-token names —
  { name: "bare first name short enough but flagged for LLM", input: "james", candidate: "james", needsLlm: true, isRoleAccount: false },
  { name: "compound jamesfell flagged for LLM", input: "jamesfell", candidate: "jamesfell", needsLlm: true, isRoleAccount: false },
  // — Role accounts —
  { name: "info", input: "info", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "contact", input: "contact", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "sales", input: "sales", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "enquiries", input: "enquiries", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "enquiry singular", input: "enquiry", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "hello", input: "hello", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "noreply", input: "noreply", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "no-reply", input: "no-reply", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "donotreply", input: "donotreply", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "info1 numeric variant", input: "info1", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "accounts (plural)", input: "accounts", candidate: null, needsLlm: false, isRoleAccount: true },
  { name: "case-insensitive INFO", input: "INFO", candidate: null, needsLlm: false, isRoleAccount: true },
  // — Garbage / can't extract —
  { name: "single letter j", input: "j", candidate: null, needsLlm: false, isRoleAccount: false },
  { name: "numeric local-part", input: "01234", candidate: null, needsLlm: false, isRoleAccount: false },
  { name: "leading digits user1", input: "user1", candidate: null, needsLlm: false, isRoleAccount: false },
  { name: "empty string", input: "", candidate: null, needsLlm: false, isRoleAccount: false },
  // — Edge cases —
  { name: "dotted with short first token", input: "j.fell", candidate: null, needsLlm: false, isRoleAccount: false },
  { name: "leading separator strips empty segment", input: ".james.fell", candidate: "james", needsLlm: false, isRoleAccount: false },
];

describe("classifyLocalPart (table-driven)", () => {
  for (const c of LOCAL_PART_CASES) {
    it(c.name, () => {
      const r = classifyLocalPart(c.input);
      expect(r.candidate).toBe(c.candidate);
      expect(r.needsLlm).toBe(c.needsLlm);
      expect(r.isRoleAccount).toBe(c.isRoleAccount);
    });
  }
});

describe("parseOfficerFirstName", () => {
  it("parses SURNAME, Forename style", () => {
    expect(parseOfficerFirstName("SMITH, John")).toBe("john");
  });
  it("takes the first forename only", () => {
    expect(parseOfficerFirstName("SMITH, John Quentin")).toBe("john");
  });
  it("skips Mr/Mrs/Ms/Dr honorific tokens", () => {
    expect(parseOfficerFirstName("SMITH, Dr John")).toBe("john");
    expect(parseOfficerFirstName("SMITH, Mr John")).toBe("john");
    expect(parseOfficerFirstName("SMITH, Mrs Jane")).toBe("jane");
  });
  it("returns null when no comma", () => {
    expect(parseOfficerFirstName("Smith John")).toBeNull();
  });
  it("returns null on empty / nullish", () => {
    expect(parseOfficerFirstName("")).toBeNull();
    expect(parseOfficerFirstName(null)).toBeNull();
    expect(parseOfficerFirstName(undefined)).toBeNull();
  });
  it("rejects numeric or too-short tokens", () => {
    expect(parseOfficerFirstName("SMITH, J")).toBeNull();
    expect(parseOfficerFirstName("SMITH, 123")).toBeNull();
  });
  it("strips trailing punctuation on the first forename", () => {
    expect(parseOfficerFirstName("SMITH, John.")).toBe("john");
  });
});

describe("pickPrimaryDirector (CH officers payload)", () => {
  // Realistic-ish fixture loosely shaped per the public API docs
  // — extra fields trimmed for the test.
  const FIXTURE: OfficerLite[] = [
    {
      name: "BAKER, Jane",
      officer_role: "secretary",
      appointed_on: "2018-06-01",
      resigned_on: null,
    },
    {
      name: "SMITH, John",
      officer_role: "director",
      appointed_on: "2010-01-01",
      resigned_on: "2015-12-31",
    },
    {
      name: "JONES, Mary",
      officer_role: "director",
      appointed_on: "2015-06-15",
      resigned_on: null,
    },
    {
      name: "DOE, Alex",
      officer_role: "director",
      appointed_on: "2020-09-01",
      resigned_on: null,
    },
  ];

  it("returns the active director among mixed roles", () => {
    const single: OfficerLite[] = [
      FIXTURE[0], // secretary — excluded
      FIXTURE[2], // active director Mary
    ];
    const picked = pickPrimaryDirector(single);
    expect(picked?.name).toBe("JONES, Mary");
  });

  it("excludes resigned directors", () => {
    const onlyResigned: OfficerLite[] = [FIXTURE[1]]; // SMITH resigned
    expect(pickPrimaryDirector(onlyResigned)).toBeNull();
  });

  it("picks the most-recently-appointed when multiple are active", () => {
    const picked = pickPrimaryDirector(FIXTURE);
    expect(picked?.name).toBe("DOE, Alex");
  });

  it("returns null on empty input", () => {
    expect(pickPrimaryDirector([])).toBeNull();
    expect(pickPrimaryDirector(undefined)).toBeNull();
  });

  it("end-to-end: pick + parse → 'Alex'", () => {
    const picked = pickPrimaryDirector(FIXTURE);
    expect(parseOfficerFirstName(picked?.name)).toBe("alex");
  });

  // Expanded role filter coverage — see PRINCIPAL_OFFICER_ROLES in
  // first-name.ts. The earlier narrow filter rejected anything that
  // wasn't exactly `director`, which excluded ~58% of installers
  // (mostly LLPs).
  it("accepts an active llp-member as a principal", () => {
    const llp: OfficerLite[] = [
      {
        name: "DOE, Sam",
        officer_role: "llp-member",
        appointed_on: "2021-01-01",
        resigned_on: null,
      },
    ];
    expect(pickPrimaryDirector(llp)?.name).toBe("DOE, Sam");
  });

  it("accepts an active llp-designated-member", () => {
    const llp: OfficerLite[] = [
      {
        name: "DOE, Pat",
        officer_role: "llp-designated-member",
        appointed_on: "2021-01-01",
        resigned_on: null,
      },
    ];
    expect(pickPrimaryDirector(llp)?.name).toBe("DOE, Pat");
  });

  it("accepts a corporate-director", () => {
    const corp: OfficerLite[] = [
      {
        name: "HOLDCO, LTD",
        officer_role: "corporate-director",
        appointed_on: "2019-04-01",
        resigned_on: null,
      },
    ];
    expect(pickPrimaryDirector(corp)?.name).toBe("HOLDCO, LTD");
  });

  it("still excludes secretaries even when they're the only role", () => {
    const onlySecretary: OfficerLite[] = [
      {
        name: "BAKER, Jane",
        officer_role: "secretary",
        appointed_on: "2018-06-01",
        resigned_on: null,
      },
    ];
    expect(pickPrimaryDirector(onlySecretary)).toBeNull();
  });

  it("still excludes nominee-directors (placeholder, not a principal)", () => {
    const nominee: OfficerLite[] = [
      {
        name: "NOMINEE, Ltd",
        officer_role: "nominee-director",
        appointed_on: "2020-01-01",
        resigned_on: null,
      },
    ];
    expect(pickPrimaryDirector(nominee)).toBeNull();
  });

  it("picks the most-recently-appointed when role types mix", () => {
    const mixed: OfficerLite[] = [
      {
        name: "OLDER, Alice",
        officer_role: "director",
        appointed_on: "2010-01-01",
        resigned_on: null,
      },
      {
        name: "NEWER, Bob",
        officer_role: "llp-member",
        appointed_on: "2024-06-15",
        resigned_on: null,
      },
    ];
    expect(pickPrimaryDirector(mixed)?.name).toBe("NEWER, Bob");
  });

  it("treats officer_role case-insensitively", () => {
    const mixed: OfficerLite[] = [
      {
        name: "DOE, Cam",
        officer_role: "LLP-Member",
        appointed_on: "2021-01-01",
        resigned_on: null,
      },
    ];
    expect(pickPrimaryDirector(mixed)?.name).toBe("DOE, Cam");
  });
});

describe("sanitiseFirstName", () => {
  it("title-cases lowercased input", () => {
    expect(sanitiseFirstName("james")).toBe("James");
  });
  it("title-cases all-caps short input", () => {
    expect(sanitiseFirstName("JO")).toBe("Jo");
  });
  it("rejects all-caps long input", () => {
    expect(sanitiseFirstName("JAMES")).toBeNull();
  });
  it("rejects names containing digits", () => {
    expect(sanitiseFirstName("james2")).toBeNull();
  });
  it("rejects single-letter names", () => {
    expect(sanitiseFirstName("j")).toBeNull();
  });
  it("rejects names longer than 30 chars", () => {
    expect(sanitiseFirstName("a".repeat(31))).toBeNull();
  });
  it("preserves apostrophes with case", () => {
    expect(sanitiseFirstName("o'brien")).toBe("O'Brien");
  });
  it("preserves hyphens with case", () => {
    expect(sanitiseFirstName("mary-jane")).toBe("Mary-Jane");
  });
  it("returns null on empty / nullish", () => {
    expect(sanitiseFirstName(null)).toBeNull();
    expect(sanitiseFirstName(undefined)).toBeNull();
    expect(sanitiseFirstName("   ")).toBeNull();
  });
});
