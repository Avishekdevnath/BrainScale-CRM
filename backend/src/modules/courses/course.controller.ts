import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as courseService from './course.service';

export const createCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await courseService.createCourse(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const courses = await courseService.listCourses(req.user!.workspaceId!);
  res.json(courses);
});

export const getCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  const course = await courseService.getCourse(courseId, req.user!.workspaceId!);
  res.json(course);
});

export const updateCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  const result = await courseService.updateCourse(
    courseId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const deleteCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  const result = await courseService.deleteCourse(courseId, req.user!.workspaceId!, req.user!.sub);
  res.json(result);
});

