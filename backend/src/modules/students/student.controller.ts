import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as studentService from './student.service';

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await studentService.createStudent(
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await studentService.listStudents(
    req.user!.workspaceId!,
    req.user!.sub,
    req.query as any
  );
  res.json(result);
});

export const getStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const student = await studentService.getStudent(studentId, req.user!.workspaceId!);
  res.json(student);
});

export const updateStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const result = await studentService.updateStudent(
    studentId,
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(result);
});

export const deleteStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const result = await studentService.deleteStudent(studentId, req.user!.workspaceId!);
  res.json(result);
});

export const bulkDeleteStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await studentService.bulkDeleteStudents(
    req.user!.workspaceId!,
    req.validatedData!.studentIds
  );
  res.json(result);
});

export const addPhone = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const result = await studentService.addPhone(
    studentId,
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const removePhone = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, phoneId } = req.params;
  const result = await studentService.removePhone(
    studentId,
    req.user!.workspaceId!,
    phoneId
  );
  res.json(result);
});

export const bulkImportFromPaste = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await studentService.bulkImportFromPaste(
      req.user!.workspaceId!,
      req.user!.sub,
      req.validatedData!
    );
    res.status(200).json(result);
  }
);

export const exportStudentsCsv = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const groupId = req.query.groupId as string | undefined;
    const batchId = req.query.batchId as string | undefined;
    const studentIdsParam = req.query.studentIds as string | undefined;
    const columnsParam = req.query.columns as string | undefined;
    
    // Parse columns from comma-separated string
    const columns = columnsParam
      ? columnsParam.split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;

    const studentIds = studentIdsParam
      ? studentIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : undefined;

    const csv = await studentService.exportStudentsCsv(
      req.user!.workspaceId!,
      req.user!.sub,
      groupId,
      batchId,
      columns,
      studentIds
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="students-export.csv"'
    );

    res.status(200).send(csv);
  }
);

export const addStudentToBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const result = await studentService.addStudentToBatch(
    studentId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const removeStudentFromBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, batchId } = req.params;
  const result = await studentService.removeStudentFromBatch(
    studentId,
    batchId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const getStudentBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const batches = await studentService.getStudentBatches(
    studentId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(batches);
});

export const setStudentBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const result = await studentService.setStudentBatches(
    studentId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const getStudentStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const stats = await studentService.getStudentStats(studentId, req.user!.workspaceId!);
  res.json(stats);
});

export const fixBangladeshPhones = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await studentService.fixBangladeshPhones(req.user!.workspaceId!);
  res.json(result);
});

export const fixDuplicateStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await studentService.fixDuplicateStudents(req.user!.workspaceId!, req.user!.sub);
  res.json(result);
});
