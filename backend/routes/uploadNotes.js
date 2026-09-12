const express=require('express');
const router=express.Router();
const multer=require('multer');
const {uploadToCloudinary}=require('../config/cloudinary');
const note=require('../models/note');

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{fileSize:10*1024*1024}
});
router.post('/',upload.single('pdfFile'),async(req,res)=>{
    try{
        if(!req.file){
            return res.status(400).json({success:false,message:'Please upload a pdf file'});
        }
        const result=new uploadToCloudinary(req.file.buffer,req.file.originalname);
        const newNote=new Note({
            title: req.body.title,
            semester: req.body.semester,
            fileUrl: result.secure_url,     
            cloudinaryId: result.public_id,
            isAiVerified: true
        });
        await newNote.save();
        res.status(201).json({
            success:true,
            message:'Note uploaded to cloudinary successfully.',
            note:newNote
        });
    }
    catch(error){
        console.error('Upload Error:',error);
        res.status(500).json({success:false,message:error.message});
    }
});
module.exports=router;
