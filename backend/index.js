const port = 4000;
const express= require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path =require("path");
const cors = require("cors");
const { toUSVString } = require("util");
const { type } = require("os");
const { log } = require("console");


app.use(express.json());
app.use(cors());
mongoose.connect("mongodb+srv://richshop:1200180@cluster0.i9o3y.mongodb.net/e-commerce");

app.get("/",(req,res)=>{
  res.send("Express App is Running")
})
// image storage
const storage = multer.diskStorage({
  destination: './upload/images',
  filename:(req,file,cb)=>{
   return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`) 
  }
})
const upload = multer({storage:storage})
app.use('/images',express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
res.json({
  success:1,
  image_url:`http://localhost:${port}/images/${req.file.filename}`
})  
})

// Schema for Creating product
const Product = mongoose.model("product",{
  id:{
    type: Number,
    required:true,
  },
  name:{
    type:String,
    required:true,
  },
  image:{
    type:String,
    required:true,
  },
  category:{
    type:String,
    required:true,
  },
  new_price:{
    type:Number,
    required:true,
  },
  old_price:{
    type:Number,
    required:true,
  },
  date:{
    type:Date,
    default:Date.now,
  },
  available:{
    type:Boolean,
    default:true,
  }
})
app.post('/addproduct', async(req,res)=>{
  let  products = await Product.find({});
  let id;
  if(products.length>0)
  {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id+1;
  }
  else{
    id=1;
  }
const product = new Product({
  id:id,
  name:req.body.name,
  image:req.body.image,
  category:req.body.category,
  new_price:req.body.new_price,
  old_price:req.body.old_price,
});
console.log(product);
await product.save();
console.log("Saved");
res.json({
  success:true,
  name:req.body.name,
})
})

// remove Api
app.post('/removeproduct', async(req,res)=>{
  await Product.findOneAndDelete({id:req.body.id});
  console.log("Removed");
  res.json({
    success:true,
    name:req.body.name
  })
})
//fetch all_products
app.get('/allproducts', async(req,res)=>{
  let products = await Product.find({});
  res.send(products);
})
// user schema
const Users = mongoose.model('Users',{
  name:{
    type:String,
  },
  email:{
    type:String,
    unique:true,
  },
 password:{
  type:String,
 },
 cartData:{
  type:Object,
 },
 date:{
  type:Date,
  default:Date.now,
 }
})

// register endUser
app.post('/signup',async (req,res)=>{
  let check = await Users.findOne({email:req.body.email});
  if (check) {
    return res.status(400).json({success:false,errors:"existing user an email"});

  }
  let cart = {};
  for (let i =0; i < 300; i++) {
    cart[i]= 0;
  }
  const user = new Users({
    name: req.body.username,
    email:req.body.email,
    password: req.body.password,
    cartData:cart,
  })
  await user.save();
  const data = {
    user:{
      id:user.id
    }
  }
  const token = jwt.sign(data,'secret_ecom');
  res.json({success:true,token})
})

//endpoint login
app.post('/login', async(req,res)=>{
  let user = await Users.findOne({email:req.body.email});
  if(user) {
    const passCompare = req.body.password === user.password;
    if (passCompare){
      const data = {
        user:{
          id:user.id
        }
      }
      const token = jwt.sign(data,'scret_ecom');
      res.json({success:true,token});
    }
    else{
      res.json({success:false,errors:"Wrong password"});
    }
  }
  else{
    res.json({success:false,errors:"Wrond Email id"})
  }
})

//endpoint new collection
app.get('/newcollection', async(req,res)=>{
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  console.log("NewCollection Fetched");
  res.send(newcollection);
})
//end point popular in women
app.get('/popularinwomen', async(req,res)=>{
let products = await Product.find({category:"women"});
let popular_in_women = products.slice(0,4);
console.log("Popular in women fetched");
res.send(popular_in_women);
})
//creatind middleware to fetch user
const fetchUser = async (req,res,next)=>{
  const token = req.header('auth-token');
  if(!token) {
    res.status(401).send({errors:"Please authenticate useing vail"})
  }
  else{
    try{
 const data = jwt.verify(token,'scret_ecom');
 req.user = data.user;
 next();
    }catch(error) {
      res.status(401).send({errors:"Please authenticate useing valid token"})
    }
  }
}

//endpoint of add to cart

app.post('/addtocart',fetchUser, async(req,res)=>{
  console.log("added",req.body.itemId);
  let userData = await Users.findOne({_id:req.user.id});
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
  res.send("Added")
})
// remove from cart
app.post('/removefromcart', fetchUser, async (req,res)=>{
  console.log("removed",req.body.itemId);
  let userData = await Users.findOne({_id:req.user.id});
  if(userData.cartData[req.body.itemId]>0)
  userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
  res.send("Removed") 
})
//end point to get cart data
app.post('/getcart',fetchUser,async(req,res)=>{
  console.log("GetCart");
  let userData = await Users.findOne({_id:req.user.id});
  res.json(userData.cartData);
})

app.listen(port,(error)=>{
  if(!error) {
    console.log("Server Running on Port", port)
  }
  else{
    console.log("Error : "+error)
  }
})


