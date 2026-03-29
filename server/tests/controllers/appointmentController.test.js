import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockAppointmentModel = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn(),
};

jest.unstable_mockModule("../../models/Appointment.js", () => ({
  default: mockAppointmentModel,
}));

jest.unstable_mockModule("../../models/User.js", () => ({
  default: mockUserModel,
}));

const {
  createAppointment,
  deleteAppointment,
  getAppointments,
  updateAppointment,
} = await import("../../controllers/appointmentController.js");

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

describe("Appointment Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAppointments", () => {
    it("returns current user's appointments", async () => {
      const appointments = [{ _id: "a1" }, { _id: "a2" }];
      const sort = jest.fn().mockResolvedValue(appointments);
      const populate = jest.fn().mockReturnValue({ sort });
      mockAppointmentModel.find.mockReturnValue({ populate });

      const req = { userId: "u1" };
      const res = createMockRes();

      await getAppointments(req, res);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith({ memberId: "u1" });
      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.appointments).toEqual(appointments);
    });
  });

  describe("createAppointment", () => {
    it("returns 400 for invalid pastor id", async () => {
      const req = { userId: "u1", body: { pastorId: "bad-id", scheduledFor: "2026-03-29T10:00" } };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Valid pastor id is required");
    });

    it("returns 404 when pastor does not exist", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = {
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
        },
      };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Pastor not found");
    });

    it("creates an appointment", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "p1",
          role: "pastor",
          firstName: "Pat",
          lastName: "Shepherd",
        }),
      });
      mockAppointmentModel.create.mockResolvedValue({ _id: "a1" });
      mockAppointmentModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: "a1",
          memberId: "u1",
          pastorId: { _id: "p1", firstName: "Pat", lastName: "Shepherd" },
          status: "pending",
        }),
      });

      const req = {
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
          location: "Office",
          topic: "Counseling",
          notes: "Need guidance",
        },
      };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(mockAppointmentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: "u1",
          pastorId: "507f1f77bcf86cd799439011",
          location: "Office",
          topic: "Counseling",
          notes: "Need guidance",
          status: "pending",
        })
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("Meeting scheduled successfully");
    });
  });

  describe("updateAppointment", () => {
    it("returns 400 for invalid meeting id", async () => {
      const req = {
        params: { id: "bad-id" },
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
        },
      };
      const res = createMockRes();

      await updateAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid meeting id");
    });

    it("returns 403 when requester does not own the meeting", async () => {
      mockAppointmentModel.findById.mockResolvedValue({
        memberId: { toString: () => "other-user" },
      });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
        },
      };
      const res = createMockRes();

      await updateAppointment(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });

    it("updates an owned meeting", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      mockAppointmentModel.findById
        .mockResolvedValueOnce({
          _id: "a1",
          memberId: { toString: () => "u1" },
          save,
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue({
            _id: "a1",
            topic: "Updated topic",
          }),
        });
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "p1",
          role: "pastor",
          firstName: "Pat",
          lastName: "Shepherd",
        }),
      });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
          topic: " Updated topic ",
        },
      };
      const res = createMockRes();

      await updateAppointment(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Meeting updated successfully");
    });
  });

  describe("deleteAppointment", () => {
    it("returns 404 when meeting does not exist", async () => {
      mockAppointmentModel.findById.mockResolvedValue(null);

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
      };
      const res = createMockRes();

      await deleteAppointment(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Meeting not found");
    });

    it("deletes an owned meeting", async () => {
      const deleteOne = jest.fn().mockResolvedValue(undefined);
      mockAppointmentModel.findById.mockResolvedValue({
        memberId: { toString: () => "u1" },
        deleteOne,
      });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
      };
      const res = createMockRes();

      await deleteAppointment(req, res);

      expect(deleteOne).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Meeting cancelled successfully");
    });
  });
});
