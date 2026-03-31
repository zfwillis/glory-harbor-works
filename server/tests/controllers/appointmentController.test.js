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
  getPastorAppointments,
  updateAppointmentStatus,
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
    it("returns 403 for non-member requester", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });

      const req = { userId: "p1" };
      const res = createMockRes();

      await getAppointments(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Member access required");
    });

    it("returns current user's appointments", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
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

    it("returns 500 when loading appointments fails", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const populate = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error("db failed")),
      });
      mockAppointmentModel.find.mockReturnValue({ populate });

      const req = { userId: "u1" };
      const res = createMockRes();

      await getAppointments(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to load meetings");
    });
  });

  describe("getPastorAppointments", () => {
    it("returns 403 for non-pastor requester", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });

      const req = { userId: "u1" };
      const res = createMockRes();

      await getPastorAppointments(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Pastor access required");
    });

    it("returns current pastor appointments", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      const appointments = [{ _id: "a1" }];
      const sort = jest.fn().mockResolvedValue(appointments);
      const populateMember = jest.fn().mockReturnValue({ sort });
      mockAppointmentModel.find.mockReturnValue({
        populate: populateMember,
      });

      const req = { userId: "p1" };
      const res = createMockRes();

      await getPastorAppointments(req, res);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith({ pastorId: "p1" });
      expect(res.statusCode).toBe(200);
      expect(res.body.appointments).toEqual(appointments);
    });

    it("returns 500 when loading pastor appointments fails", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      const populate = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error("db failed")),
      });
      mockAppointmentModel.find.mockReturnValue({ populate });

      const req = { userId: "p1" };
      const res = createMockRes();

      await getPastorAppointments(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to load pastor schedule");
    });
  });

  describe("createAppointment", () => {
    it("returns 403 for non-member requester", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });

      const req = {
        userId: "p1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
        },
      };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Member access required");
    });

    it("returns 400 for invalid pastor id", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = { userId: "u1", body: { pastorId: "bad-id", scheduledFor: "2026-03-29T10:00" } };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Valid pastor id is required");
    });

    it("returns 400 when meeting date and time is missing", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = {
        userId: "u1",
        body: { pastorId: "507f1f77bcf86cd799439011" },
      };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Meeting date and time is required");
    });

    it("returns 400 when meeting date and time is invalid", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = {
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "not-a-date",
        },
      };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Meeting date and time is invalid");
    });

    it("returns 404 when pastor does not exist", async () => {
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
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

    it("returns 400 when selected time is outside pastor availability", async () => {
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            _id: "p1",
            role: "pastor",
            availability: [{ day: "Monday", start: "09:00", end: "12:00" }],
          }),
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

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Selected time is outside the pastor's availability");
    });

    it("creates an appointment", async () => {
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            _id: "p1",
            role: "pastor",
            firstName: "Pat",
            lastName: "Shepherd",
            availability: [{ day: "Sunday", start: "09:00", end: "12:00" }],
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
          notes: "Need guidance",
          status: "pending",
        })
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("Meeting scheduled successfully");
    });

    it("trims location and notes when creating an appointment", async () => {
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            _id: "p1",
            role: "pastor",
            availability: [{ day: "Sunday", start: "09:00", end: "12:00" }],
          }),
        });
      mockAppointmentModel.create.mockResolvedValue({ _id: "a1" });
      mockAppointmentModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: "a1" }),
      });

      const req = {
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
          location: "  Office  ",
          notes: "  Need guidance  ",
        },
      };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(mockAppointmentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          location: "Office",
          notes: "Need guidance",
        })
      );
    });

    it("returns 500 when creating an appointment fails", async () => {
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            _id: "p1",
            role: "pastor",
            availability: [{ day: "Sunday", start: "09:00", end: "12:00" }],
          }),
        });
      mockAppointmentModel.create.mockRejectedValue(new Error("write failed"));

      const req = {
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
        },
      };
      const res = createMockRes();

      await createAppointment(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to schedule meeting");
    });
  });

  describe("updateAppointment", () => {
    it("returns 403 for non-member requester", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "p1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
        },
      };
      const res = createMockRes();

      await updateAppointment(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Member access required");
    });

    it("returns 400 for invalid meeting id", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
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

    it("returns 400 for invalid pastor id on update", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
        body: {
          pastorId: "bad-id",
          scheduledFor: "2026-03-29T10:00",
        },
      };
      const res = createMockRes();

      await updateAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Valid pastor id is required");
    });

    it("returns 400 when update meeting date and time is missing", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
        },
      };
      const res = createMockRes();

      await updateAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Meeting date and time is required");
    });

    it("returns 400 when update meeting date and time is invalid", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "bad-date",
        },
      };
      const res = createMockRes();

      await updateAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Meeting date and time is invalid");
    });

    it("returns 404 when meeting to update does not exist", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      mockAppointmentModel.findById.mockResolvedValue(null);

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

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Meeting not found");
    });

    it("returns 404 when pastor on update does not exist", async () => {
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue(null),
        });
      mockAppointmentModel.findById.mockResolvedValue({
        _id: "a1",
        memberId: { toString: () => "u1" },
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

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Pastor not found");
    });

    it("returns 403 when requester does not own the meeting", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
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
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            _id: "p1",
            role: "pastor",
            firstName: "Pat",
            lastName: "Shepherd",
            availability: [{ day: "Sunday", start: "09:00", end: "12:00" }],
          }),
        });
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

      expect(save).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Meeting updated successfully");
    });

    it("trims location and notes and resets status to pending on update", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const appointment = {
        _id: "a1",
        memberId: { toString: () => "u1" },
        status: "declined",
        save,
      };
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            _id: "p1",
            role: "pastor",
            availability: [{ day: "Sunday", start: "09:00", end: "12:00" }],
          }),
        });
      mockAppointmentModel.findById
        .mockResolvedValueOnce(appointment)
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue({ _id: "a1" }),
        });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
        body: {
          pastorId: "507f1f77bcf86cd799439011",
          scheduledFor: "2026-03-29T10:00",
          location: "  Office  ",
          notes: "  Follow up  ",
        },
      };
      const res = createMockRes();

      await updateAppointment(req, res);

      expect(appointment.location).toBe("Office");
      expect(appointment.notes).toBe("Follow up");
      expect(appointment.status).toBe("pending");
    });

    it("returns 400 when updated time is outside pastor availability", async () => {
      mockUserModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "member" }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            _id: "p1",
            role: "pastor",
            availability: [{ day: "Monday", start: "09:00", end: "12:00" }],
          }),
        });
      mockAppointmentModel.findById.mockResolvedValueOnce({
        _id: "a1",
        memberId: { toString: () => "u1" },
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

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Selected time is outside the pastor's availability");
    });

    it("returns 500 when updating an appointment fails", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      mockAppointmentModel.findById.mockRejectedValue(new Error("db failed"));

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

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to update meeting");
    });
  });

  describe("updateAppointmentStatus", () => {
    it("returns 400 for invalid status", async () => {
      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "p1",
        body: { status: "pending" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid meeting status");
    });

    it("returns 403 for non-pastor requester", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
        body: { status: "approved" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Pastor access required");
    });

    it("returns 400 for invalid meeting id when updating status", async () => {
      const req = {
        params: { id: "bad-id" },
        userId: "p1",
        body: { status: "approved" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid meeting id");
    });

    it("returns 404 when meeting status target does not exist", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      mockAppointmentModel.findById.mockResolvedValue(null);

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "p1",
        body: { status: "approved" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Meeting not found");
    });

    it("returns 403 when pastor does not own the meeting", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      mockAppointmentModel.findById.mockResolvedValue({
        pastorId: { toString: () => "other-pastor" },
      });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "p1",
        body: { status: "approved" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });

    it("updates status for assigned pastor", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      mockAppointmentModel.findById
        .mockResolvedValueOnce({
          _id: "a1",
          pastorId: { toString: () => "p1" },
          status: "pending",
          save,
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: "a1",
              status: "approved",
            }),
          }),
        });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "p1",
        body: { status: "approved" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Meeting status updated successfully");
    });

    it("returns 500 when updating status fails", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      mockAppointmentModel.findById.mockRejectedValue(new Error("db failed"));

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "p1",
        body: { status: "approved" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to update meeting status");
    });
  });

  describe("deleteAppointment", () => {
    it("returns 403 for non-member requester", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "p1",
      };
      const res = createMockRes();

      await deleteAppointment(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Member access required");
    });

    it("returns 404 when meeting does not exist", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
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

    it("returns 400 for invalid meeting id on delete", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });

      const req = {
        params: { id: "bad-id" },
        userId: "u1",
      };
      const res = createMockRes();

      await deleteAppointment(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid meeting id");
    });

    it("returns 403 when requester does not own meeting being deleted", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      mockAppointmentModel.findById.mockResolvedValue({
        memberId: { toString: () => "other-user" },
      });

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
      };
      const res = createMockRes();

      await deleteAppointment(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });

    it("deletes an owned meeting", async () => {
      const deleteOne = jest.fn().mockResolvedValue(undefined);
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
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

    it("returns 500 when deleting a meeting fails", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      mockAppointmentModel.findById.mockRejectedValue(new Error("db failed"));

      const req = {
        params: { id: "507f1f77bcf86cd799439012" },
        userId: "u1",
      };
      const res = createMockRes();

      await deleteAppointment(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to cancel meeting");
    });
  });
});
