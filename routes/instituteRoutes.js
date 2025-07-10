import express from "express";
import {
  createInstitute,
  getInstitutes,
  getInstituteById,
  updateInstitute,
  deleteInstitute
} from "../controllers/instituteController.js";

const institueRouter = express.Router();

institueRouter.post("/", createInstitute);
institueRouter.get("/", getInstitutes);
institueRouter.get("/:id", getInstituteById);
institueRouter.put("/:id", updateInstitute);
institueRouter.delete("/:id", deleteInstitute);

export default institueRouter;
