import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Medicine, Pharmacy, Inventory, User } from "./models.js";

const ago = hours => hours == null
  ? null
  : new Date(Date.now() - hours * 3600000);

const medicines = [
  ["m1","Paracetamol","Paracetamol",["Dolo","Crocin"],"500 mg","tablet","OTC"],
  ["m2","Paracetamol","Paracetamol",["Dolo 650"],"650 mg","tablet","OTC"],
  ["m3","Amoxicillin","Amoxicillin",["Mox"],"500 mg","capsule","Rx"],
  ["m4","Metformin","Metformin",["Glycomet"],"500 mg","tablet","Rx"],
  ["m5","Cetirizine","Cetirizine",["Okacet"],"10 mg","tablet","OTC"],
  ["m6","Azithromycin","Azithromycin",["Azithral"],"500 mg","tablet","Rx"],
  ["m7","Ibuprofen","Ibuprofen",["Brufen"],"400 mg","tablet","OTC"],
  ["m8","Pantoprazole","Pantoprazole",["Pantop"],"40 mg","tablet","Rx"]
].map(([id,name,generic,brands,strength,form,rx]) =>
  ({ id,name,generic,brands,strength,form,rx })
);

const pharmacies = [
  ["p1","Demo Life Pharmacy","Perundurai Rd, Erode",11.341,77.7172],
  ["p2","Demo Care Medicals","Brough Rd, Erode",11.352,77.725],
  ["p3","Demo City Pharmacy","Bus Stand, Erode",11.33,77.7],
  ["p4","Demo Health Plus","Perundurai",11.41,77.76],
  ["p5","Demo Wellness","Bhavani Rd",11.28,77.68]
].map(([id,name,address,lat,lng],i) => ({
  id,name,address,lat,lng,
  phone:"+91 00000 0000"+i,
  hours:"9 AM - 9 PM",
  demo:true,
  verification:id==="p5" ? "pending" : "approved"
}));

const stock = [
  [1,1,120,30,2],[1,3,8,95,5],[1,4,0,40,3],[1,5,60,25,50],
  [2,1,40,32,1],[2,2,25,38,4],[2,6,15,110,6],
  [3,1,0,30,2],[3,7,70,45,10],[3,8,30,120,null],
  [4,2,90,36,3],[4,3,20,90,30],[5,4,55,42,8],[5,5,12,22,7]
].map(([p,m,quantity,price,h],i) => ({
  id:"i"+(i+1),
  pharmacyId:"p"+p,
  medicineId:"m"+m,
  quantity,
  price,
  lastVerifiedAt:ago(h),
  source:"DEMO"
}));

try {
  await mongoose.connect(process.env.MONGODB_URI);

  // Insert only when the collections are empty; existing records are preserved.
  if (await Medicine.countDocuments() === 0)
    await Medicine.insertMany(medicines);

  if (await Pharmacy.countDocuments() === 0)
    await Pharmacy.insertMany(pharmacies);

  if (await Inventory.countDocuments() === 0)
    await Inventory.insertMany(stock);

  const demoUsers = [
    {
      id:"u1",
      name:"Demo Owner",
      email:"owner@demo.com",
      role:"pharmacy",
      pharmacyId:"p1",
      hash:await bcrypt.hash("demo1234",10)
    },
    {
      id:"admin1",
      name:"Demo Admin",
      email:"admin@demo.com",
      role:"admin",
      hash:await bcrypt.hash("admin1234",10)
    }
  ];

  for (const user of demoUsers) {
    if (!(await User.exists({email:user.email})))
      await User.create(user);
  }

  console.log("Seed completed.");
  console.log("Medicines:",await Medicine.countDocuments());
  console.log("Pharmacies:",await Pharmacy.countDocuments());
  console.log("Inventory:",await Inventory.countDocuments());
  console.log("Users:",await User.countDocuments());
} catch (error) {
  console.error("Seed failed:",error.message);
  process.exitCode=1;
} finally {
  await mongoose.disconnect();
}
