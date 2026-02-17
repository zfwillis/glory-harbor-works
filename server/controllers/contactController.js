import Contact from "../models/Contact.js";

// Submit contact form
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: "Please provide name, email, subject, and message" 
      });
    }

    // Create contact submission
    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    res.status(201).json({
      message: "Message sent successfully! We'll get back to you soon.",
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
      },
    });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({ 
      message: "Failed to submit message. Please try again later.",
      error: error.message 
    });
  }
};

// Get all contact submissions (admin/pastor only)
export const getContactSubmissions = async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    const filter = status ? { status } : {};
    
    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update contact status (admin/pastor only)
export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["new", "read", "responded"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { 
        status,
        ...(status === "responded" && {
          respondedBy: req.userId,
          respondedAt: new Date(),
        })
      },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: "Contact submission not found" });
    }

    res.json({ message: "Status updated", contact });
  } catch (error) {
    console.error("Update contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
