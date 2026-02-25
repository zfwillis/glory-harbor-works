import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockContactModel = {
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

jest.unstable_mockModule("../../models/Contact.js", () => ({
  default: mockContactModel,
}));

const {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus,
} = await import("../../controllers/contactController.js");

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

describe("Contact Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submitContactForm", () => {
    it("returns 400 when required fields are missing", async () => {
      const req = { body: { name: "A", email: "", subject: "", message: "" } };
      const res = createMockRes();

      await submitContactForm(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Please provide name, email, subject, and message");
    });

    it("returns 201 and contact payload when submission succeeds", async () => {
      mockContactModel.create.mockResolvedValue({
        _id: "67c0f1d2d7f3a8d4b4c8f111",
        name: "Jane Doe",
        email: "jane@example.com",
        subject: "Prayer request",
      });

      const req = {
        body: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "123-456-7890",
          subject: "Prayer request",
          message: "Please pray for my family.",
        },
      };
      const res = createMockRes();

      await submitContactForm(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockContactModel.create).toHaveBeenCalledWith(req.body);
      expect(res.body.contact.email).toBe("jane@example.com");
    });
  });

  describe("getContactSubmissions", () => {
    it("returns filtered contacts with count", async () => {
      const contacts = [{ _id: "1" }, { _id: "2" }];
      mockContactModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(contacts),
        }),
      });

      const req = { query: { status: "new", limit: "10" } };
      const res = createMockRes();

      await getContactSubmissions(req, res);

      expect(mockContactModel.find).toHaveBeenCalledWith({ status: "new" });
      expect(res.body.count).toBe(2);
      expect(res.body.contacts).toEqual(contacts);
    });
  });

  describe("updateContactStatus", () => {
    it("returns 400 for invalid status", async () => {
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        body: { status: "closed" },
      };
      const res = createMockRes();

      await updateContactStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid status");
    });

    it("returns 404 when contact submission does not exist", async () => {
      mockContactModel.findByIdAndUpdate.mockResolvedValue(null);
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        body: { status: "read" },
        userId: "67c0f1d2d7f3a8d4b4c8f999",
      };
      const res = createMockRes();

      await updateContactStatus(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Contact submission not found");
    });

    it("sets respondedBy and respondedAt when status is responded", async () => {
      mockContactModel.findByIdAndUpdate.mockResolvedValue({
        _id: "67c0f1d2d7f3a8d4b4c8f111",
        status: "responded",
      });
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        body: { status: "responded" },
        userId: "67c0f1d2d7f3a8d4b4c8f999",
      };
      const res = createMockRes();

      await updateContactStatus(req, res);

      expect(mockContactModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "67c0f1d2d7f3a8d4b4c8f111",
        expect.objectContaining({
          status: "responded",
          respondedBy: "67c0f1d2d7f3a8d4b4c8f999",
          respondedAt: expect.any(Date),
        }),
        { new: true }
      );
      expect(res.body.message).toBe("Status updated");
    });
  });
});
