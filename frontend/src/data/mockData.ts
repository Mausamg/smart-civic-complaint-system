import type {
  Complaint,
  Department,
  StaffMember,
  Notification,
  Announcement,
  FAQItem,
  User,
} from '../types';

export const currentUser: User = {
  id: 'u-citizen-1',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  phone: '+977 9841234567',
  role: 'citizen',
  avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200',
  ward: 'Ward 7',
  municipality: 'Kathmandu Metropolitan City',
  address: 'Chabahil, Kathmandu',
};

export const staffUser: User = {
  id: 'u-staff-1',
  name: 'Bishnu Gurung',
  email: 'b.gurung@kmc.gov',
  phone: '+977 9801112222',
  role: 'staff',
  avatar: 'https://images.pexels.com/photos/1223647/pexels-photo-1223647.jpeg?auto=compress&cs=tinysrgb&w=200',
  department: 'Roads & Infrastructure',
  position: 'Field Supervisor',
  ward: 'Ward 7',
};

export const adminUser: User = {
  id: 'u-admin-1',
  name: 'Priya Thapa',
  email: 'p.thapa@kmc.gov',
  phone: '+977 9803334444',
  role: 'admin',
  avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200',
  department: 'Administration',
  position: 'System Administrator',
};

const photo = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;

const isoDaysAgo = (days: number, hours = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
};

export const complaints: Complaint[] = [
  {
    id: 'c-1',
    trackingId: 'KMC-2024-001284',
    title: 'Large pothole near Chabahil Chowk causing traffic jams',
    description:
      'There is a large pothole approximately 2 meters wide near the Chabahil Chowk intersection. It has been growing over the past two weeks and is causing vehicles to swerve into oncoming traffic. Multiple minor accidents have occurred. Rain water accumulates here making it impossible to judge depth.',
    category: 'potholes',
    subcategory: 'Pothole',
    citizen: { name: 'Aarav Sharma', id: 'u-citizen-1' },
    municipality: 'Kathmandu Metropolitan City',
    ward: 'Ward 7',
    address: 'Chabahil Chowk, Kathmandu 44600',
    coordinates: { lat: 27.7172, lng: 85.3509 },
    priority: 'high',
    status: 'in_progress',
    assignedDepartment: 'Roads & Infrastructure',
    assignedStaff: 'Bishnu Gurung',
    submittedAt: isoDaysAgo(12),
    dueDate: isoDaysAgo(-3),
    lastUpdate: isoDaysAgo(1, 4),
    estimatedResolution: isoDaysAgo(-2),
    isAnonymous: false,
    isPublic: true,
    evidence: [
      { id: 'e1', type: 'image', url: photo(259758), caption: 'Pothole view from south side', uploadedAt: isoDaysAgo(12) },
      { id: 'e2', type: 'image', url: photo(259749), caption: 'Water accumulation after rain', uploadedAt: isoDaysAgo(12) },
    ],
    timeline: [
      { id: 't1', status: 'submitted', label: 'Complaint Submitted', description: 'Reported via web portal.', timestamp: isoDaysAgo(12), actor: 'Aarav Sharma', completed: true },
      { id: 't2', status: 'under_review', label: 'Under Review', description: 'Complaint verified and prioritised.', timestamp: isoDaysAgo(10), actor: 'System', completed: true },
      { id: 't3', status: 'assigned', label: 'Assigned to Department', description: 'Assigned to Roads & Infrastructure — Bishnu Gurung.', timestamp: isoDaysAgo(9), actor: 'Priya Thapa', completed: true },
      { id: 't4', status: 'in_progress', label: 'Work in Progress', description: 'Repair crew dispatched to site. Materials ordered.', timestamp: isoDaysAgo(3), actor: 'Bishnu Gurung', completed: true },
    ],
    comments: [
      { id: 'cm1', author: 'Bishnu Gurung', authorRole: 'staff', message: 'We have inspected the site and ordered repair materials. Work will begin within 2 days.', timestamp: isoDaysAgo(3), avatar: staffUser.avatar },
      { id: 'cm2', author: 'Aarav Sharma', authorRole: 'citizen', message: 'Thank you for the update. Please expedite as traffic is heavily affected.', timestamp: isoDaysAgo(2), avatar: currentUser.avatar },
    ],
  },
  {
    id: 'c-2',
    trackingId: 'KMC-2024-001298',
    title: 'Garbage not collected for 5 days in Sano Bharyang',
    description:
      'The garbage truck has not visited our street for 5 consecutive days. Waste is piling up and causing a foul smell, attracting stray dogs. Several residents are elderly and cannot carry waste to a distant collection point.',
    category: 'garbage',
    subcategory: 'Uncollected garbage',
    citizen: { name: 'Aarav Sharma', id: 'u-citizen-1' },
    municipality: 'Kathmandu Metropolitan City',
    ward: 'Ward 5',
    address: 'Sano Bharyang Marg, Ward 5, Kathmandu',
    coordinates: { lat: 27.6945, lng: 85.3105 },
    priority: 'medium',
    status: 'resolved',
    assignedDepartment: 'Sanitation',
    assignedStaff: 'Sita Tamang',
    submittedAt: isoDaysAgo(20),
    dueDate: isoDaysAgo(15),
    lastUpdate: isoDaysAgo(8),
    estimatedResolution: isoDaysAgo(8),
    isAnonymous: false,
    isPublic: true,
    rating: 5,
    feedback: 'Collection resumed the next day. Excellent response.',
    evidence: [
      { id: 'e3', type: 'image', url: photo(276896), caption: 'Piled garbage on street corner', uploadedAt: isoDaysAgo(20) },
    ],
    timeline: [
      { id: 't5', status: 'submitted', label: 'Complaint Submitted', description: 'Reported via web portal.', timestamp: isoDaysAgo(20), actor: 'Aarav Sharma', completed: true },
      { id: 't6', status: 'under_review', label: 'Under Review', description: 'Verified with sanitation route map.', timestamp: isoDaysAgo(19), actor: 'System', completed: true },
      { id: 't7', status: 'assigned', label: 'Assigned to Department', description: 'Assigned to Sanitation — Sita Tamang.', timestamp: isoDaysAgo(18), actor: 'Priya Thapa', completed: true },
      { id: 't8', status: 'in_progress', label: 'Work in Progress', description: 'Route reassigned to cover missed street.', timestamp: isoDaysAgo(16), actor: 'Sita Tamang', completed: true },
      { id: 't9', status: 'resolved', label: 'Resolution Submitted', description: 'Garbage collected and route fixed permanently.', timestamp: isoDaysAgo(9), actor: 'Sita Tamang', completed: true },
      { id: 't10', status: 'closed', label: 'Complaint Closed', description: 'Citizen confirmed resolution with 5-star rating.', timestamp: isoDaysAgo(8), actor: 'Aarav Sharma', completed: true },
    ],
    comments: [
      { id: 'cm3', author: 'Sita Tamang', authorRole: 'staff', message: 'Route has been corrected. Collection will occur every alternate day.', timestamp: isoDaysAgo(16) },
      { id: 'cm4', author: 'Aarav Sharma', authorRole: 'citizen', message: 'Confirmed, garbage is being collected now. Thank you!', timestamp: isoDaysAgo(8), avatar: currentUser.avatar },
    ],
  },
  {
    id: 'c-3',
    trackingId: 'KMC-2024-001305',
    title: 'Streetlight broken on Joggers Lane',
    description:
      'The streetlight pole opposite house number 14 on Joggers Lane is broken and the area is pitch dark at night. Women and children feel unsafe walking in the evening.',
    category: 'streetlights',
    subcategory: 'Broken streetlight',
    citizen: { name: 'Aarav Sharma', id: 'u-citizen-1' },
    municipality: 'Kathmandu Metropolitan City',
    ward: 'Ward 7',
    address: 'Joggers Lane, Ward 7, Kathmandu',
    coordinates: { lat: 27.7212, lng: 85.3521 },
    priority: 'high',
    status: 'assigned',
    assignedDepartment: 'Electrical',
    submittedAt: isoDaysAgo(5),
    dueDate: isoDaysAgo(-2),
    lastUpdate: isoDaysAgo(2),
    estimatedResolution: isoDaysAgo(-1),
    isAnonymous: false,
    isPublic: true,
    evidence: [
      { id: 'e4', type: 'image', url: photo(276896), caption: 'Dark lane at 8 PM', uploadedAt: isoDaysAgo(5) },
    ],
    timeline: [
      { id: 't11', status: 'submitted', label: 'Complaint Submitted', description: 'Reported via web portal.', timestamp: isoDaysAgo(5), actor: 'Aarav Sharma', completed: true },
      { id: 't12', status: 'under_review', label: 'Under Review', description: 'Verified via site photo.', timestamp: isoDaysAgo(4), actor: 'System', completed: true },
      { id: 't13', status: 'assigned', label: 'Assigned to Department', description: 'Assigned to Electrical department.', timestamp: isoDaysAgo(2), actor: 'Priya Thapa', completed: true },
    ],
    comments: [],
  },
  {
    id: 'c-4',
    trackingId: 'KMC-2024-001311',
    title: 'Water pipe leakage wasting supply near Bhrikutimandap',
    description:
      'A major water pipe has been leaking for over a week near Bhrikutimandap. Hundreds of litres are wasted daily and the road is continuously flooded. This is also a health hazard.',
    category: 'water',
    subcategory: 'Pipe leakage',
    citizen: { name: 'Anonymous Reporter', id: 'u-citizen-2' },
    municipality: 'Kathmandu Metropolitan City',
    ward: 'Ward 1',
    address: 'Bhrikutimandap Marg, Ward 1, Kathmandu',
    coordinates: { lat: 27.6938, lng: 85.3168 },
    priority: 'urgent',
    status: 'under_review',
    assignedDepartment: 'Water Supply',
    submittedAt: isoDaysAgo(2),
    dueDate: isoDaysAgo(-6),
    lastUpdate: isoDaysAgo(1),
    isAnonymous: true,
    isPublic: true,
    evidence: [
      { id: 'e5', type: 'image', url: photo(259758), caption: 'Continuous water flow on road', uploadedAt: isoDaysAgo(2) },
      { id: 'e6', type: 'video', url: 'https://example.com/leak.mp4', caption: 'Leak video at 7 AM', uploadedAt: isoDaysAgo(2) },
    ],
    timeline: [
      { id: 't14', status: 'submitted', label: 'Complaint Submitted', description: 'Reported anonymously.', timestamp: isoDaysAgo(2), actor: 'Anonymous', completed: true },
      { id: 't15', status: 'under_review', label: 'Under Review', description: 'Being prioritised due to urgent severity.', timestamp: isoDaysAgo(1), actor: 'System', completed: true },
    ],
    comments: [],
  },
  {
    id: 'c-5',
    trackingId: 'KMC-2024-001271',
    title: 'Blocked drain causing waterlogging in Patan Dhoka',
    description:
      'The main drain along Patan Dhoka road is completely blocked with debris and plastic. Even light rain causes waterlogging entering nearby shops.',
    category: 'drainage',
    subcategory: 'Blocked drain',
    citizen: { name: 'Aarav Sharma', id: 'u-citizen-1' },
    municipality: 'Kathmandu Metropolitan City',
    ward: 'Ward 10',
    address: 'Patan Dhoka Road, Ward 10, Lalitpur',
    coordinates: { lat: 27.6724, lng: 85.3199 },
    priority: 'high',
    status: 'in_progress',
    assignedDepartment: 'Sanitation',
    assignedStaff: 'Sita Tamang',
    submittedAt: isoDaysAgo(15),
    dueDate: isoDaysAgo(-1),
    lastUpdate: isoDaysAgo(2),
    estimatedResolution: isoDaysAgo(-0.5),
    isAnonymous: false,
    isPublic: true,
    evidence: [
      { id: 'e7', type: 'image', url: photo(276896), caption: 'Waterlogged street after rain', uploadedAt: isoDaysAgo(15) },
    ],
    timeline: [
      { id: 't16', status: 'submitted', label: 'Complaint Submitted', description: 'Reported via web portal.', timestamp: isoDaysAgo(15), actor: 'Aarav Sharma', completed: true },
      { id: 't17', status: 'under_review', label: 'Under Review', description: 'Verified during inspection.', timestamp: isoDaysAgo(13), actor: 'System', completed: true },
      { id: 't18', status: 'assigned', label: 'Assigned to Department', description: 'Assigned to Sanitation.', timestamp: isoDaysAgo(12), actor: 'Priya Thapa', completed: true },
      { id: 't19', status: 'in_progress', label: 'Work in Progress', description: 'Debris clearing underway. 60% complete.', timestamp: isoDaysAgo(3), actor: 'Sita Tamang', completed: true },
    ],
    comments: [
      { id: 'cm5', author: 'Sita Tamang', authorRole: 'staff', message: 'Debris removal is 60% done. Heavy machinery deployed.', timestamp: isoDaysAgo(3) },
    ],
  },
  {
    id: 'c-6',
    trackingId: 'KMC-2024-001260',
    title: 'Traffic signal malfunctioning at Maitighar junction',
    description:
      'The traffic signal at Maitighar junction has been stuck on red for the south-bound lane for 3 days. Manual traffic control is causing long delays during peak hours.',
    category: 'traffic_signals',
    subcategory: 'Signal not working',
    citizen: { name: 'Aarav Sharma', id: 'u-citizen-1' },
    municipality: 'Kathmandu Metropolitan City',
    ward: 'Ward 11',
    address: 'Maitighar Junction, Ward 11, Kathmandu',
    coordinates: { lat: 27.6894, lng: 85.3281 },
    priority: 'urgent',
    status: 'resolved',
    assignedDepartment: 'Traffic & Transport',
    assignedStaff: 'Ramesh KC',
    submittedAt: isoDaysAgo(8),
    dueDate: isoDaysAgo(6),
    lastUpdate: isoDaysAgo(5),
    estimatedResolution: isoDaysAgo(5),
    isAnonymous: false,
    isPublic: true,
    rating: 4,
    feedback: 'Fixed quickly but signal timing could be better.',
    evidence: [
      { id: 'e8', type: 'image', url: photo(259749), caption: 'Stuck signal', uploadedAt: isoDaysAgo(8) },
    ],
    timeline: [
      { id: 't20', status: 'submitted', label: 'Complaint Submitted', description: 'Reported via web portal.', timestamp: isoDaysAgo(8), actor: 'Aarav Sharma', completed: true },
      { id: 't21', status: 'under_review', label: 'Under Review', description: 'Verified.', timestamp: isoDaysAgo(7), actor: 'System', completed: true },
      { id: 't22', status: 'assigned', label: 'Assigned to Department', description: 'Assigned to Traffic & Transport — Ramesh KC.', timestamp: isoDaysAgo(7), actor: 'Priya Thapa', completed: true },
      { id: 't23', status: 'in_progress', label: 'Work in Progress', description: 'Control unit being replaced.', timestamp: isoDaysAgo(6), actor: 'Ramesh KC', completed: true },
      { id: 't24', status: 'resolved', label: 'Resolution Submitted', description: 'Control unit replaced, signal restored.', timestamp: isoDaysAgo(6), actor: 'Ramesh KC', completed: true },
      { id: 't25', status: 'closed', label: 'Complaint Closed', description: 'Confirmed by citizen, 4-star rating.', timestamp: isoDaysAgo(5), actor: 'Aarav Sharma', completed: true },
    ],
    comments: [],
  },
  {
    id: 'c-7',
    trackingId: 'KMC-2024-001245',
    title: 'Vandalised park bench in Balaju Park',
    description: 'Two park benches near the east gate of Balaju Park have been vandalised with broken slats, making them unusable and unsafe for children.',
    category: 'property_damage',
    subcategory: 'Damaged public building',
    citizen: { name: 'Aarav Sharma', id: 'u-citizen-1' },
    municipality: 'Kathmandu Metropolitan City',
    ward: 'Ward 3',
    address: 'Balaju Park East Gate, Ward 3, Kathmandu',
    coordinates: { lat: 27.7339, lng: 85.2891 },
    priority: 'low',
    status: 'rejected',
    assignedDepartment: 'Public Works',
    submittedAt: isoDaysAgo(25),
    dueDate: isoDaysAgo(18),
    lastUpdate: isoDaysAgo(20),
    isAnonymous: false,
    isPublic: true,
    evidence: [
      { id: 'e9', type: 'image', url: photo(276896), caption: 'Broken bench', uploadedAt: isoDaysAgo(25) },
    ],
    timeline: [
      { id: 't26', status: 'submitted', label: 'Complaint Submitted', description: 'Reported via web portal.', timestamp: isoDaysAgo(25), actor: 'Aarav Sharma', completed: true },
      { id: 't27', status: 'under_review', label: 'Under Review', description: 'Reviewed by Public Works.', timestamp: isoDaysAgo(23), actor: 'System', completed: true },
      { id: 't28', status: 'rejected', label: 'Rejected', description: 'Park renovation scheduled in Q3, benches will be replaced then.', timestamp: isoDaysAgo(20), actor: 'Public Works', completed: true },
    ],
    comments: [
      { id: 'cm6', author: 'Public Works Dept', authorRole: 'staff', message: 'The entire park is scheduled for renovation in Q3. Benches will be replaced as part of that project.', timestamp: isoDaysAgo(20) },
    ],
  },
  {
    id: 'c-8',
    trackingId: 'KMC-2024-001320',
    title: 'Continuous construction noise at night in Bansbari',
    description: 'A construction site in Bansbari is operating heavy machinery past 10 PM, well beyond permitted hours. Residents including young children cannot sleep.',
    category: 'noise',
    subcategory: 'Construction noise',
    citizen: { name: 'Aarav Sharma', id: 'u-citizen-1' },
    municipality: 'Kathmandu Metropolitan City',
    ward: 'Ward 3',
    address: 'Bansbari Road, Ward 3, Kathmandu',
    coordinates: { lat: 27.7439, lng: 85.3311 },
    priority: 'medium',
    status: 'submitted',
    assignedDepartment: 'Local Police',
    submittedAt: isoDaysAgo(1),
    dueDate: isoDaysAgo(-7),
    lastUpdate: isoDaysAgo(1),
    isAnonymous: true,
    isPublic: true,
    evidence: [],
    timeline: [
      { id: 't29', status: 'submitted', label: 'Complaint Submitted', description: 'Reported anonymously via web portal.', timestamp: isoDaysAgo(1), actor: 'Anonymous', completed: true },
    ],
    comments: [],
  },
];

export const departments: Department[] = [
  { id: 'd1', name: 'Roads & Infrastructure', head: 'Bishnu Gurung', categories: ['potholes', 'property_damage'], staffCount: 14, activeComplaints: 38, avgResolutionDays: 6, satisfaction: 4.2, isActive: true },
  { id: 'd2', name: 'Sanitation', head: 'Sita Tamang', categories: ['garbage', 'drainage'], staffCount: 22, activeComplaints: 54, avgResolutionDays: 4, satisfaction: 4.5, isActive: true },
  { id: 'd3', name: 'Electrical', head: 'Anil Maharjan', categories: ['streetlights'], staffCount: 9, activeComplaints: 17, avgResolutionDays: 5, satisfaction: 4.0, isActive: true },
  { id: 'd4', name: 'Water Supply', head: 'Kamala Rai', categories: ['water'], staffCount: 11, activeComplaints: 23, avgResolutionDays: 7, satisfaction: 3.8, isActive: true },
  { id: 'd5', name: 'Traffic & Transport', head: 'Ramesh KC', categories: ['traffic_signals'], staffCount: 8, activeComplaints: 12, avgResolutionDays: 3, satisfaction: 4.6, isActive: true },
  { id: 'd6', name: 'Urban Planning', head: 'Deepak Shrestha', categories: ['illegal_construction'], staffCount: 6, activeComplaints: 9, avgResolutionDays: 14, satisfaction: 3.5, isActive: true },
  { id: 'd7', name: 'Public Safety', head: 'Sara Bista', categories: ['public_safety'], staffCount: 7, activeComplaints: 6, avgResolutionDays: 2, satisfaction: 4.4, isActive: true },
  { id: 'd8', name: 'Local Police', head: 'Hari Lama', categories: ['noise'], staffCount: 18, activeComplaints: 15, avgResolutionDays: 5, satisfaction: 3.9, isActive: false },
];

export const staffMembers: StaffMember[] = [
  { id: 's1', name: 'Bishnu Gurung', email: 'b.gurung@kmc.gov', phone: '+977 9801112222', department: 'Roads & Infrastructure', role: 'Field Supervisor', activeComplaints: 6, resolvedComplaints: 142, satisfaction: 4.3, avatar: 'https://images.pexels.com/photos/1223647/pexels-photo-1223647.jpeg?auto=compress&cs=tinysrgb&w=200', isActive: true },
  { id: 's2', name: 'Sita Tamang', email: 's.tamang@kmc.gov', phone: '+977 9803335555', department: 'Sanitation', role: 'Route Manager', activeComplaints: 8, resolvedComplaints: 210, satisfaction: 4.6, avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200', isActive: true },
  { id: 's3', name: 'Anil Maharjan', email: 'a.maharjan@kmc.gov', phone: '+977 9804446666', department: 'Electrical', role: 'Maintenance Lead', activeComplaints: 4, resolvedComplaints: 98, satisfaction: 4.1, avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200', isActive: true },
  { id: 's4', name: 'Ramesh KC', email: 'r.kc@kmc.gov', phone: '+977 9805557777', department: 'Traffic & Transport', role: 'Signal Technician', activeComplaints: 3, resolvedComplaints: 76, satisfaction: 4.5, avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=200', isActive: true },
  { id: 's5', name: 'Kamala Rai', email: 'k.rai@kmc.gov', phone: '+977 9806668888', department: 'Water Supply', role: 'Field Engineer', activeComplaints: 5, resolvedComplaints: 64, satisfaction: 3.7, avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=200', isActive: true },
  { id: 's6', name: 'Deepak Shrestha', email: 'd.shrestha@kmc.gov', phone: '+977 9807779999', department: 'Urban Planning', role: 'Inspector', activeComplaints: 2, resolvedComplaints: 31, satisfaction: 3.4, avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=200', isActive: false },
];

export const notifications: Notification[] = [
  { id: 'n1', type: 'complaint_update', title: 'Complaint Updated', message: 'KMC-2024-001284 status changed to In Progress.', timestamp: isoDaysAgo(1, 4), read: false, link: '/citizen/complaints/c-1' },
  { id: 'n2', type: 'comment', title: 'New Comment', message: 'Bishnu Gurung commented on your complaint KMC-2024-001284.', timestamp: isoDaysAgo(3), read: false, link: '/citizen/complaints/c-1' },
  { id: 'n3', type: 'resolution', title: 'Complaint Resolved', message: 'KMC-2024-001298 has been resolved. Please confirm and rate.', timestamp: isoDaysAgo(9), read: true, link: '/citizen/complaints/c-2' },
  { id: 'n4', type: 'announcement', title: 'New Announcement', message: 'Scheduled water supply maintenance in Ward 7 this Saturday.', timestamp: isoDaysAgo(2), read: false, link: '/citizen/announcements' },
  { id: 'n5', type: 'complaint_update', title: 'Complaint Assigned', message: 'KMC-2024-001305 has been assigned to the Electrical department.', timestamp: isoDaysAgo(2), read: true, link: '/citizen/complaints/c-3' },
  { id: 'n6', type: 'escalation', title: 'Complaint Escalated', message: 'KMC-2024-001311 has been marked urgent and escalated.', timestamp: isoDaysAgo(1), read: false, link: '/citizen/complaints/c-4' },
];

export const announcements: Announcement[] = [
  {
    id: 'a1',
    title: 'Scheduled Water Supply Maintenance — Ward 7',
    body: 'The Water Supply department will conduct maintenance on the main pipeline supplying Ward 7 this Saturday from 8 AM to 2 PM. Water supply may be interrupted during this period. Please store water in advance. Tanker support will be available at the ward office for emergency needs.',
    category: 'maintenance',
    publishedAt: isoDaysAgo(2),
    expiresAt: isoDaysAgo(-2),
    ward: 'Ward 7',
    featured: true,
    author: 'Water Supply Department',
  },
  {
    id: 'a2',
    title: 'Monsoon Preparedness Drive 2024',
    body: 'The municipality is launching a monsoon preparedness drive from next week. Citizens are requested to report blocked drains and waterlogging issues promptly. Free drain cleaning assistance is available in flood-prone wards.',
    category: 'general',
    publishedAt: isoDaysAgo(7),
    ward: undefined,
    featured: true,
    author: 'Municipal Office',
  },
  {
    id: 'a3',
    title: 'New Online Complaint Tracking System Launched',
    body: 'We are excited to announce a fully redesigned complaint tracking system with real-time status updates, a public map, and faster response times. Citizens can now track every complaint with a unique tracking ID.',
    category: 'policy',
    publishedAt: isoDaysAgo(14),
    featured: false,
    author: 'Administration',
  },
  {
    id: 'a4',
    title: 'Community Clean-up Event — Ward 5',
    body: 'Join us this Sunday for a community clean-up drive in Ward 5. Volunteers will gather at the ward office at 7 AM. Equipment and refreshments will be provided. Lets keep our neighbourhood clean together.',
    category: 'event',
    publishedAt: isoDaysAgo(5),
    expiresAt: isoDaysAgo(-2),
    ward: 'Ward 5',
    featured: false,
    author: 'Sanitation Department',
  },
  {
    id: 'a5',
    title: 'Emergency Helpline Numbers Updated',
    body: 'Emergency contact numbers for police, ambulance, and fire services have been updated. Please save the new numbers displayed on the website footer. The complaint system is NOT for emergencies.',
    category: 'emergency',
    publishedAt: isoDaysAgo(20),
    featured: false,
    author: 'Public Safety Department',
  },
];

export const faqItems: FAQItem[] = [
  { id: 'f1', category: 'Account', question: 'How do I create an account?', answer: 'Click the Register button at the top right, fill in your personal details, municipality, and ward. You will receive a verification email to activate your account.' },
  { id: 'f2', category: 'Account', question: 'I forgot my password. What should I do?', answer: 'On the login page, click "Forgot password". Enter your registered email and follow the reset link sent to your inbox.' },
  { id: 'f3', category: 'Account', question: 'Can I submit complaints anonymously?', answer: 'Yes. When filing a complaint you can choose the "Display anonymously" option. Your personal details will never be shown on public pages regardless of this setting.' },
  { id: 'f4', category: 'Complaint Submission', question: 'What evidence should I attach?', answer: 'Clear photos or short videos of the issue are most helpful. Include context such as the scale of the problem and surrounding landmarks.' },
  { id: 'f5', category: 'Complaint Submission', question: 'How do I set the correct priority?', answer: 'Use Urgent only for issues threatening safety or causing major disruption. High is for significant issues, Medium for normal concerns, and Low for minor ones.' },
  { id: 'f6', category: 'Complaint Tracking', question: 'How do I track my complaint?', answer: 'Use the "Track Complaint" page and enter your tracking ID (e.g. KMC-2024-001284). You can also view all your complaints from the citizen dashboard.' },
  { id: 'f7', category: 'Complaint Tracking', question: 'What do the different statuses mean?', answer: 'Submitted means received, Under Review means being verified, Assigned means a department is handling it, In Progress means work has started, Resolved means fixed and awaiting your confirmation.' },
  { id: 'f8', category: 'Privacy', question: 'Is my personal information public?', answer: 'No. Your phone number, email, and exact home address are never displayed publicly. Only the complaint location and details are shown on the public map.' },
  { id: 'f9', category: 'Privacy', question: 'Can I delete my account?', answer: 'Yes. Go to Profile > Settings > Privacy controls and request account deletion. Your personal data will be removed but complaint records are retained for municipal records.' },
  { id: 'f10', category: 'Complaint Resolution', question: 'My issue was marked resolved but it is not fixed. What do I do?', answer: 'Open the complaint details page and click "Reopen". Provide a description and new evidence if possible. The complaint will be sent back to the assigned department.' },
  { id: 'f11', category: 'Complaint Resolution', question: 'How long does resolution take?', answer: 'It depends on category and priority. Most standard complaints are resolved within 3-7 days. Urgent issues are addressed within 24-48 hours.' },
  { id: 'f12', category: 'Emergency Complaints', question: 'Can I report an emergency here?', answer: 'No. This system is not for emergencies. For police, ambulance, fire, or immediate danger, call the emergency numbers shown on every page footer.' },
];

export const testimonials = [
  { id: 'tm1', name: 'Sunita Maharjan', ward: 'Ward 5', quote: 'My garbage complaint was resolved in 2 days. The tracking made me feel heard for the first time.', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { id: 'tm2', name: 'Rajesh Tamang', ward: 'Ward 11', quote: 'The pothole near my shop that plagued us for months was finally fixed after I reported it here.', avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { id: 'tm3', name: 'Anjali Shrestha', ward: 'Ward 7', quote: 'Being able to see other complaints on the map helps me know I am not alone in facing these issues.', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=120' },
];

export const recentResolvedPublic: Complaint[] = complaints
  .filter((c) => c.status === 'resolved' && c.isPublic)
  .slice(0, 3);

export const platformStats = {
  totalComplaints: 4827,
  resolvedComplaints: 3194,
  activeComplaints: 1421,
  averageResolutionDays: 5.2,
  satisfactionScore: 4.3,
  departments: 8,
  wards: 32,
  citizensRegistered: 18650,
};

export const monthlyTrend = [
  { month: 'Jan', submitted: 320, resolved: 280 },
  { month: 'Feb', submitted: 410, resolved: 360 },
  { month: 'Mar', submitted: 380, resolved: 390 },
  { month: 'Apr', submitted: 520, resolved: 470 },
  { month: 'May', submitted: 610, resolved: 540 },
  { month: 'Jun', submitted: 580, resolved: 600 },
  { month: 'Jul', submitted: 690, resolved: 620 },
  { month: 'Aug', submitted: 720, resolved: 660 },
  { month: 'Sep', submitted: 650, resolved: 690 },
  { month: 'Oct', submitted: 700, resolved: 670 },
  { month: 'Nov', submitted: 540, resolved: 580 },
  { month: 'Dec', submitted: 480, resolved: 510 },
];

export const statusDistribution = [
  { name: 'Submitted', value: 210, color: '#3b82f6' },
  { name: 'Under Review', value: 180, color: '#a855f7' },
  { name: 'Assigned', value: 240, color: '#f97316' },
  { name: 'In Progress', value: 510, color: '#f59e0b' },
  { name: 'Resolved', value: 3194, color: '#22c55e' },
  { name: 'Rejected', value: 142, color: '#ef4444' },
  { name: 'Reopened', value: 78, color: '#ec4899' },
  { name: 'Closed', value: 273, color: '#64748b' },
];

export const categoryBreakdown = [
  { name: 'Potholes', value: 980 },
  { name: 'Garbage', value: 1240 },
  { name: 'Streetlights', value: 460 },
  { name: 'Water', value: 540 },
  { name: 'Drainage', value: 720 },
  { name: 'Traffic', value: 310 },
  { name: 'Other', value: 577 },
];

export const wardComplaints = [
  { ward: 'W1', complaints: 180 },
  { ward: 'W3', complaints: 240 },
  { ward: 'W5', complaints: 320 },
  { ward: 'W7', complaints: 410 },
  { ward: 'W10', complaints: 290 },
  { ward: 'W11', complaints: 350 },
  { ward: 'W15', complaints: 210 },
];

export const departmentPerformance = [
  { dept: 'Roads', resolved: 142, active: 38 },
  { dept: 'Sanitation', resolved: 210, active: 54 },
  { dept: 'Electrical', resolved: 98, active: 17 },
  { dept: 'Water', resolved: 64, active: 23 },
  { dept: 'Traffic', resolved: 76, active: 12 },
  { dept: 'Urban', resolved: 31, active: 9 },
];

export const resolutionTimeData = [
  { dept: 'Roads', days: 6 },
  { dept: 'Sanitation', days: 4 },
  { dept: 'Electrical', days: 5 },
  { dept: 'Water', days: 7 },
  { dept: 'Traffic', days: 3 },
  { dept: 'Urban', days: 14 },
];

export const satisfactionTrend = [
  { month: 'Jan', score: 4.1 },
  { month: 'Feb', score: 4.0 },
  { month: 'Mar', score: 4.2 },
  { month: 'Apr', score: 4.3 },
  { month: 'May', score: 4.4 },
  { month: 'Jun', score: 4.3 },
  { month: 'Jul', score: 4.5 },
  { month: 'Aug', score: 4.4 },
  { month: 'Sep', score: 4.3 },
];
