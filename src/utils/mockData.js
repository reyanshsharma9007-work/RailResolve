export const initialUser = {
  name: "Rajesh Kumar",
  role: "passenger", // 'passenger' | 'admin'
  email: "rajesh.kumar@example.com",
  phone: "+91 98765 43210",
  pnr: "2489-1058-39",
  tier: "Verified Passenger",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBikO5Q8O6sJKFRh2TyU_yIecJEbNSt2V5Bhvpfk-LMP2L1BwRgK-t0Tx2j2c8JH4A9rcKSQsKpZS37oFtWFqhFBWCqrJBxHbe_An59ILWQgpEKaTt_yBWGjAPnyLRhHhwCSXRBqTa0tJBLlQ5sJlhWxzZIXIO4WDhS9m2oTjVowIB1kvLZFSHTzi6I1tvbvhX6rcD5EHMY3cMgQeLROo1bXgeyN_5BdsqNByeMAPzXdvRkagVO38Wxjm2-Vj_cdKetmA"
};

export const initialComplaints = [
  {
    id: "RR-8942-VB",
    pnr: "2489105839",
    trainNo: "20901",
    trainName: "Vande Bharat Sleeper Express",
    coach: "B4",
    seat: "24 Lower",
    passengerName: "Rajesh Kumar",
    passengerPhone: "+91 98765 43210",
    category: "Electrical / AC Cooling",
    title: "Air Conditioning Temperature Control Malfunction in Coach B4",
    description: "The AC unit above berth 24 is blowing excessively warm air since departure from New Delhi. Temperature inside compartment is 29°C.",
    priority: "HIGH",
    status: "IN_PROGRESS", // 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED'
    slaRemaining: "12m 45s",
    createdAt: "2025-09-18 08:30 AM",
    assignedTo: "Rakesh Sharma (OBHS Coach Lead)",
    station: "Kanpur Central (CNB)",
    speedTelemetry: "130 km/h",
    timeline: [
      {
        stage: "Submitted",
        time: "08:30 AM",
        desc: "Complaint filed via RailResolve Web Gateway",
        completed: true
      },
      {
        stage: "Automated Triage",
        time: "08:31 AM",
        desc: "Categorized as Electrical/AC. Routed to Northern Railway Control",
        completed: true
      },
      {
        stage: "Staff Assigned",
        time: "08:34 AM",
        desc: "Assigned to On-board Coach Captain Rakesh Sharma",
        completed: true
      },
      {
        stage: "Onboard Action",
        time: "08:40 AM",
        desc: "Tech team inspecting HVAC sensor & filter unit in Coach B4",
        completed: true,
        current: true
      },
      {
        stage: "Resolved & Closed",
        time: "Pending",
        desc: "Final verification with passenger",
        completed: false
      }
    ],
    chatMessages: [
      { sender: "system", text: "RailResolve System: Ticket assigned to On-Board Tech Lead Rakesh Sharma.", time: "08:34 AM" },
      { sender: "staff", text: "Hello Mr. Rajesh, I am entering Coach B4 with compressor bypass kit in 3 minutes.", time: "08:38 AM" },
      { sender: "passenger", text: "Thank you Rakesh ji, berth 24. It is getting very humid.", time: "08:39 AM" }
    ]
  },
  {
    id: "RR-7721-VB",
    pnr: "4829103941",
    trainNo: "22436",
    trainName: "Vande Bharat Express (NDLS - BSB)",
    coach: "C2",
    seat: "42 Window",
    passengerName: "Priya Sundaram",
    passengerPhone: "+91 97112 33445",
    category: "Coach Cleanliness",
    title: "Tray table and window area requires immediate sanitization",
    description: "Spilled beverage on tray table from previous passenger not cleaned prior to boarding.",
    priority: "MEDIUM",
    status: "OPEN",
    slaRemaining: "08m 10s",
    createdAt: "2025-09-18 09:12 AM",
    assignedTo: "Unassigned (Pending OBHS Crew)",
    station: "Ghaziabad Jn (GZB)",
    speedTelemetry: "110 km/h",
    timeline: [
      { stage: "Submitted", time: "09:12 AM", desc: "Complaint logged", completed: true },
      { stage: "Automated Triage", time: "09:13 AM", desc: "Routed to Housekeeping Crew", completed: true },
      { stage: "Staff Assigned", time: "Pending", desc: "Awaiting crew dispatch", completed: false },
      { stage: "Onboard Action", time: "Pending", desc: "Cleaning execution", completed: false },
      { stage: "Resolved & Closed", time: "Pending", desc: "Passenger verification", completed: false }
    ],
    chatMessages: []
  },
  {
    id: "RR-9102-VB",
    pnr: "9102837461",
    trainNo: "12002",
    trainName: "Shatabdi Express",
    coach: "E1",
    seat: "12 A",
    passengerName: "Amitabh Verma",
    passengerPhone: "+91 99887 76655",
    category: "Catering / Food Quality",
    title: "Breakfast tray served cold without proper seal",
    description: "Requested hot tea and fresh breakfast, package thermal seal was broken.",
    priority: "HIGH",
    status: "RESOLVED",
    slaRemaining: "Resolved in 14m",
    createdAt: "2025-09-18 07:15 AM",
    assignedTo: "Sanjay Gupta (IRCTC Pantry Manager)",
    station: "Agra Cantt (AGC)",
    speedTelemetry: "125 km/h",
    timeline: [
      { stage: "Submitted", time: "07:15 AM", desc: "Complaint logged", completed: true },
      { stage: "Automated Triage", time: "07:16 AM", desc: "Routed to IRCTC Manager", completed: true },
      { stage: "Staff Assigned", time: "07:18 AM", desc: "Sanjay Gupta assigned", completed: true },
      { stage: "Onboard Action", time: "07:22 AM", desc: "Replacement meal served hot with apology kit", completed: true },
      { stage: "Resolved & Closed", time: "07:29 AM", desc: "Closed by passenger rating 5/5", completed: true }
    ],
    chatMessages: []
  }
];

export const initialTickets = [
  {
    pnr: "2489-1058-39",
    trainNo: "20901",
    trainName: "Vande Bharat Sleeper Express",
    from: "New Delhi (NDLS)",
    to: "Kalka (KLK)",
    depTime: "06:00 AM, 18 Sep",
    arrTime: "11:45 AM, 18 Sep",
    coach: "B4",
    seat: "24",
    class: "AC 3 Tier (3A)",
    status: "CNF / Confirmed",
    hasActiveGrievance: true,
    activeGrievanceId: "RR-8942-VB"
  },
  {
    pnr: "8391-4029-11",
    trainNo: "22436",
    trainName: "Vande Bharat Express",
    from: "Varanasi (BSB)",
    to: "New Delhi (NDLS)",
    depTime: "03:00 PM, 22 Sep",
    arrTime: "11:00 PM, 22 Sep",
    coach: "C4",
    seat: "18",
    class: "Executive Chair Car (EC)",
    status: "CNF / Confirmed",
    hasActiveGrievance: false
  }
];
