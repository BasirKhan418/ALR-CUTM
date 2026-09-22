import assert from "node:assert/strict"
import { test } from "node:test"
import { clampAnalyticsScope } from "./analytics.ts"

const bbsr = "6ab0f5964a466f5bafc25341"
const balasore = "6ab0f5964a466f5bafc25344"
const cse = "6ab0f5964a466f5bafc25350"

test("an empty campus filter stays on the signed-in campus", () => {
  const scope = clampAnalyticsScope({
    audience: "ADMIN",
    sessionCampusId: bbsr,
    sessionDepartmentId: cse,
  })
  assert.equal(scope.campusId, bbsr)
  assert.equal(scope.allCampuses, false)
})

test("HoD cannot switch campus or department", () => {
  const scope = clampAnalyticsScope({
    audience: "HOD",
    sessionCampusId: bbsr,
    sessionDepartmentId: cse,
    campusId: balasore,
    departmentId: "6ab0f5964a466f5bafc25399",
  })
  assert.equal(scope.campusId, bbsr)
  assert.equal(scope.departmentId, cse)
  assert.equal(scope.requireDepartment, false)
})

test("HoD with no department does not open the campus", () => {
  const scope = clampAnalyticsScope({
    audience: "HOD",
    sessionCampusId: bbsr,
    sessionDepartmentId: null,
  })
  assert.equal(scope.requireDepartment, true)
  assert.equal(scope.departmentId, undefined)
})

test("Admin and Dean can choose another campus or all campuses", () => {
  const picked = clampAnalyticsScope({
    audience: "DEAN",
    sessionCampusId: bbsr,
    sessionDepartmentId: null,
    campusId: balasore,
  })
  assert.equal(picked.campusId, balasore)
  const all = clampAnalyticsScope({
    audience: "ADMIN",
    sessionCampusId: bbsr,
    sessionDepartmentId: null,
    campusId: "all",
  })
  assert.equal(all.campusId, undefined)
  assert.equal(all.allCampuses, true)
})
