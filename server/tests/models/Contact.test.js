import { describe, it, expect } from "@jest/globals";
import Contact from "../../models/Contact.js";

describe("Contact Model", () => {
  describe("Contact Schema Validation", () => {
    it("should create contact with valid required data", async () => {
      const contactData = {
        name: "John Doe",
        email: "john@example.com",
        subject: "Need support",
        message: "Please contact me.",
      };

      const contact = new Contact(contactData);
      const validationError = contact.validateSync();

      expect(validationError).toBeUndefined();
      expect(contact.name).toBe("John Doe");
      expect(contact.email).toBe("john@example.com");
      expect(contact.subject).toBe("Need support");
      expect(contact.message).toBe("Please contact me.");
    });

    it("should set default status to new", () => {
      const contact = new Contact({
        name: "Jane Doe",
        email: "jane@example.com",
        subject: "Prayer request",
        message: "Need prayer.",
      });

      expect(contact.status).toBe("new");
    });

    it("should lowercase email", () => {
      const contact = new Contact({
        name: "Jane Doe",
        email: "JANE@EXAMPLE.COM",
        subject: "Prayer request",
        message: "Need prayer.",
      });

      expect(contact.email).toBe("jane@example.com");
    });

    it("should require name, email, subject, and message", () => {
      const contact = new Contact({});
      const validationError = contact.validateSync();

      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.subject).toBeDefined();
      expect(validationError.errors.message).toBeDefined();
    });

    it("should reject invalid status values", () => {
      const contact = new Contact({
        name: "Jane Doe",
        email: "jane@example.com",
        subject: "Prayer request",
        message: "Need prayer.",
        status: "closed",
      });

      const validationError = contact.validateSync();
      expect(validationError.errors.status).toBeDefined();
    });
  });
});
