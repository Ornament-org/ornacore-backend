import { staffWelcomeTemplate } from "../../src/emails/templates/staff-welcome.template.js";
import {
  generateEmployeeCodeCandidate,
  generateTemporaryStaffPassword,
} from "../../src/modules/staff/staff.credentials.js";

describe("staff onboarding", () => {
  it("generates a name-based temporary password with six random digits", () => {
    expect(generateTemporaryStaffPassword("Rahul Sharma")).toMatch(/^Rahul@[0-9]{6}$/);
  });

  it("generates an employee code from staff initials", () => {
    expect(generateEmployeeCodeCandidate("Rahul Sharma", new Date("2026-06-19"))).toMatch(
      /^OC-RS-26[0-9]{4}$/,
    );
  });

  it("renders staff credentials in text and escaped HTML templates", () => {
    const result = staffWelcomeTemplate({
      fullName: "<script>alert(1)</script>",
      email: "staff@example.com",
      temporaryPassword: "Staff@123456",
      employeeCode: "OC-ST-261234",
      roleName: "Manager",
      loginUrl: "http://localhost:5173/login",
    });

    expect(result.text).toContain("Staff@123456");
    expect(result.html).toContain("OC-ST-261234");
    expect(result.html).not.toContain("<script>alert(1)</script>");
  });
});
