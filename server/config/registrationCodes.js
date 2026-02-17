// Registration codes for elevated roles
export const REGISTRATION_CODES = {
  leader: "GH-L#9mK7$pQ2xR4vN8",
  pastor: "GH-P@5wT3!sY6bN9xL1",
};

// Function to verify registration code
export const verifyRegistrationCode = async (role, code) => {
  if (role === "member") {
    return true; // No code required for members
  }

  const validCode = REGISTRATION_CODES[role];
  if (!validCode) {
    return false;
  }

  return code === validCode;
};
