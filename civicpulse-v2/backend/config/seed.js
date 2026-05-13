require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User  = require('../models/User');
const Issue = require('../models/Issue');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Seeding...');

  await User.deleteMany();
  await Issue.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const pass = await bcrypt.hash('password123', salt);

  const [admin, officer, citizen] = await User.insertMany([
    { name:'Admin User',    email:'admin@civicpulse.in',   password:pass, role:'admin' },
    { name:'PWD Officer',   email:'officer@civicpulse.in', password:pass, role:'department', department:'Public Works Department (PWD)' },
    { name:'Riya Sharma',   email:'riya@example.com',      password:pass, role:'citizen' }
  ]);

  await Issue.insertMany([
    { title:'Pothole on Park Street', description:'Large pothole causing accidents near Metro entrance.',
      category:'road', priority:'high', status:'in_progress',
      location:{ address:'Park Street, near Metro', area:'Park Street', lat:22.5513, lng:88.3514 },
      reportedBy:citizen._id, department:'Public Works Department (PWD)', upvotes:[admin._id],
      statusHistory:[
        { status:'pending',     message:'Issue reported',         updatedBy:citizen._id, timestamp:new Date(Date.now()-86400000*3) },
        { status:'assigned',    message:'Assigned to PWD Team 4', updatedBy:admin._id,   timestamp:new Date(Date.now()-86400000*2) },
        { status:'in_progress', message:'Repair crew dispatched', updatedBy:officer._id, timestamp:new Date(Date.now()-86400000) }
      ]
    },
    { title:'Leaking water pipe on Gariahat Rd', description:'Water pipe burst, road waterlogged.',
      category:'water', priority:'critical', status:'assigned',
      location:{ address:'Gariahat Road', area:'Gariahat', lat:22.5195, lng:88.3672 },
      reportedBy:citizen._id, department:'KMC Water Supply Department', upvotes:[admin._id, officer._id],
      statusHistory:[
        { status:'pending',  message:'Issue reported', updatedBy:citizen._id, timestamp:new Date(Date.now()-86400000) },
        { status:'assigned', message:'Assigned to KMC Water Emergency Team', updatedBy:admin._id, timestamp:new Date(Date.now()-3600000*5) }
      ]
    },
    { title:'Garbage overflow Salt Lake Sector V', description:'Bin overflowing for 3 days.',
      category:'waste', priority:'medium', status:'resolved',
      location:{ address:'Sector V, Salt Lake', area:'Salt Lake', lat:22.5762, lng:88.4323 },
      reportedBy:citizen._id, department:'Sanitation & Solid Waste Dept', upvotes:[],
      resolvedAt: new Date(Date.now()-3600000*12),
      statusHistory:[
        { status:'pending',  message:'Issue reported', updatedBy:citizen._id, timestamp:new Date(Date.now()-86400000*2) },
        { status:'resolved', message:'Garbage cleared and area sanitized', updatedBy:officer._id, timestamp:new Date(Date.now()-3600000*12) }
      ]
    }
  ]);

  console.log('✅ Seed complete!');
  console.log('Admin:   admin@civicpulse.in / password123');
  console.log('Officer: officer@civicpulse.in / password123');
  console.log('Citizen: riya@example.com / password123');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
