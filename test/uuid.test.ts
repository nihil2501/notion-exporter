import { validateUuid } from "../src/NotionExporter"

describe("Validate UUID with and without dashes", () => {
  it("Validates with dashes", () => {
    expect(validateUuid("a981a0c2-68b1-35dc-bcfc-296e52ab01ec")).toEqual(
      "a981a0c2-68b1-35dc-bcfc-296e52ab01ec"
    )
    expect(validateUuid("90123e1c-7512-523e-bb28-76fab9f2f73d")).toEqual(
      "90123e1c-7512-523e-bb28-76fab9f2f73d"
    )
    expect(validateUuid("")).toBeUndefined()
    expect(validateUuid("    ")).toBeUndefined()
    expect(validateUuid("invalid uuid string")).toBeUndefined()
    expect(
      validateUuid(
        "=Y00a-f*v00b*-00c-00d#-p00f\b-00g-00h-####00i^^^-00j*1*2*3&-L00k-\n00l-/00m-----00n-fg000-00p-00r+"
      )
    ).toBeUndefined()
  })

  it("Validates without dashes", () => {
    expect(validateUuid("e0603b592edc45f7acc7b0cccd6656e1")).toEqual(
      "e0603b59-2edc-45f7-acc7-b0cccd6656e1"
    )
    expect(validateUuid("d9428888122b11e1b85c61cd3cbb3210")).toEqual(
      "d9428888-122b-11e1-b85c-61cd3cbb3210"
    )
    expect(
      validateUuid("d9428888122b11e1b85c61cd3cbb3210000000000000")
    ).toBeUndefined()
    expect(validateUuid("d9428888122b1")).toBeUndefined()
  })
})
