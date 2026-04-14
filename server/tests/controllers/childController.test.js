import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockChild = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
};

const mockUser = {
  findOne: jest.fn(),
};

jest.unstable_mockModule("../../models/Child.js", () => ({ default: mockChild }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: mockUser }));

const {
  createChild,
  getMyChildren,
  getChildById,
  updateChild,
  deleteChild,
  acceptInvitation,
  declineInvitation,
  linkCoParent,
  unlinkCoParent,
} = await import("../../controllers/childController.js");

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

describe("Child Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a child for the authenticated parent", async () => {
    const child = { _id: "c1", firstName: "Zoe", parent: "u1" };
    mockChild.create.mockResolvedValue(child);
    const req = { userId: "u1", body: { firstName: "Zoe", lastName: "Willis", allergies: "nuts" } };
    const res = createMockRes();

    await createChild(req, res);

    expect(mockChild.create).toHaveBeenCalledWith(expect.objectContaining({ firstName: "Zoe", parent: "u1" }));
    expect(res.statusCode).toBe(201);
    expect(res.body.child).toEqual(child);
  });

  it("rejects missing child names", async () => {
    const req = { userId: "u1", body: { firstName: "" } };
    const res = createMockRes();

    await createChild(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("First name and last name are required.");
  });

  it("returns all children for primary or accepted second parent", async () => {
    const children = [{ _id: "c1" }];
    const sort = jest.fn().mockResolvedValue(children);
    const populateSecond = jest.fn().mockReturnValue({ sort });
    const populateParent = jest.fn().mockReturnValue({ populate: populateSecond });
    mockChild.find.mockReturnValue({ populate: populateParent });
    const req = { userId: "u1" };
    const res = createMockRes();

    await getMyChildren(req, res);

    expect(mockChild.find).toHaveBeenCalledWith({
      $or: [{ parent: "u1" }, { secondParent: "u1", secondParentStatus: "accepted" }],
    });
    expect(res.body.children).toEqual(children);
  });

  it("allows a populated parent to view a child", async () => {
    const child = { _id: "c1", parent: { _id: "u1" }, secondParent: null };
    const populateSecond = jest.fn().mockResolvedValue(child);
    const populateParent = jest.fn().mockReturnValue({ populate: populateSecond });
    mockChild.findById.mockReturnValue({ populate: populateParent });
    const req = { userId: "u1", params: { id: "c1" } };
    const res = createMockRes();

    await getChildById(req, res);

    expect(res.body.child).toEqual(child);
  });

  it("blocks unauthorized child view", async () => {
    const child = { _id: "c1", parent: { _id: "owner" }, secondParent: null };
    const populateSecond = jest.fn().mockResolvedValue(child);
    const populateParent = jest.fn().mockReturnValue({ populate: populateSecond });
    mockChild.findById.mockReturnValue({ populate: populateParent });
    const req = { userId: "stranger", params: { id: "c1" } };
    const res = createMockRes();

    await getChildById(req, res);

    expect(res.statusCode).toBe(403);
  });

  it("updates an authorized child", async () => {
    const child = { _id: "c1", parent: "u1", save: jest.fn().mockResolvedValue(undefined) };
    mockChild.findById.mockResolvedValue(child);
    const req = { userId: "u1", params: { id: "c1" }, body: { firstName: "Zoey", notes: "Updated" } };
    const res = createMockRes();

    await updateChild(req, res);

    expect(child.firstName).toBe("Zoey");
    expect(child.notes).toBe("Updated");
    expect(child.save).toHaveBeenCalled();
    expect(res.body.message).toBe("Child profile updated.");
  });

  it("deletes only when requester is primary parent", async () => {
    const child = { _id: "c1", parent: "u1", deleteOne: jest.fn().mockResolvedValue(undefined) };
    mockChild.findById.mockResolvedValue(child);
    const req = { userId: "u1", params: { id: "c1" } };
    const res = createMockRes();

    await deleteChild(req, res);

    expect(child.deleteOne).toHaveBeenCalled();
    expect(res.body.message).toBe("Child profile deleted.");
  });

  it("accepts and declines co-parent invitations", async () => {
    const saveAccept = jest.fn().mockResolvedValue(undefined);
    mockChild.findOne.mockResolvedValueOnce({ secondParentStatus: "pending", save: saveAccept });
    const acceptRes = createMockRes();

    await acceptInvitation({ userId: "u2", params: { id: "c1" } }, acceptRes);

    expect(acceptRes.body.message).toContain("Invitation accepted");
    expect(saveAccept).toHaveBeenCalled();

    const saveDecline = jest.fn().mockResolvedValue(undefined);
    mockChild.findOne.mockResolvedValueOnce({ secondParent: "u2", secondParentStatus: "pending", save: saveDecline });
    const declineRes = createMockRes();

    await declineInvitation({ userId: "u2", params: { id: "c1" } }, declineRes);

    expect(declineRes.body.message).toBe("Invitation declined.");
    expect(saveDecline).toHaveBeenCalled();
  });

  it("links and unlinks a co-parent by primary parent", async () => {
    const child = {
      _id: "c1",
      parent: "u1",
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
    };
    mockChild.findById.mockResolvedValueOnce(child);
    mockUser.findOne.mockResolvedValue({ _id: "u2", email: "other@example.com" });
    const linkRes = createMockRes();

    await linkCoParent({ userId: "u1", params: { id: "c1" }, body: { email: "Other@Example.com" } }, linkRes);

    expect(child.secondParent).toBe("u2");
    expect(child.secondParentStatus).toBe("pending");
    expect(linkRes.body.message).toContain("Invitation sent");

    const childToUnlink = { _id: "c1", parent: "u1", save: jest.fn().mockResolvedValue(undefined) };
    mockChild.findById.mockResolvedValueOnce(childToUnlink);
    const unlinkRes = createMockRes();

    await unlinkCoParent({ userId: "u1", params: { id: "c1" } }, unlinkRes);

    expect(childToUnlink.secondParent).toBeNull();
    expect(unlinkRes.body.message).toBe("Other parent removed.");
  });
});
