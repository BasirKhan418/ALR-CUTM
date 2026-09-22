export const ARCHIVAL_POLICIES = [
  "AUTHORITATIVE",
  "WORKING_COPY_BESIDE_HARDBOUND",
] as const

export type ArchivalPolicy = (typeof ARCHIVAL_POLICIES)[number]

export const ARCHIVAL_SETTING = "archivalPolicy"
export const ARCHIVAL_POLICY_DEFAULT: ArchivalPolicy = "WORKING_COPY_BESIDE_HARDBOUND"

export function archivalSentence(policy: ArchivalPolicy) {
  if (policy === "AUTHORITATIVE") {
    return "The digital Learning Record is the authoritative copy."
  }
  return "The digital Learning Record is a working copy kept beside the hardbound booklet."
}
