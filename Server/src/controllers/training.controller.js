import Employee from '../models/Employee.js';
import TrainingProgram from '../models/TrainingProgram.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeTraining } from '../utils/serialize.js';
import { notify, notifyMany, recordActivity } from '../utils/notify.js';
import { todayISO } from '../utils/dates.js';

const findProgram = async (id) => {
  const program = await TrainingProgram.findById(id);
  if (!program) throw ApiError.notFound('Training programme not found.');
  return program;
};

const findEnrollment = (program, employeeId) =>
  program.enrolled.find((entry) => entry.employee.toString() === String(employeeId));

const statusFor = (progress) => {
  if (progress >= 100) return 'Completed';
  if (progress > 0) return 'In progress';
  return 'Not started';
};

export async function listTraining(_req, res) {
  const rows = await TrainingProgram.find({}).sort({ mandatory: -1, title: 1 }).lean();
  res.json({ data: rows.map(serializeTraining) });
}

export async function enrollTraining(req, res) {
  const employeeId = req.user.employeeId;
  if (req.body.employeeId && String(req.body.employeeId) !== employeeId) {
    throw ApiError.forbidden('You can only enroll yourself in a programme.');
  }

  const program = await findProgram(req.params.id);
  if (findEnrollment(program, employeeId)) {
    throw ApiError.conflict('You’re already enrolled in this programme.');
  }

  program.enrolled.push({
    employee: employeeId,
    progress: 0,
    status: 'Not started',
    assignedOn: todayISO(),
    completedOn: null,
  });
  await program.save();

  await recordActivity({
    employeeId,
    text: `enrolled in “${program.title}”`,
    type: 'training',
  });

  res.status(201).json({ data: serializeTraining(program) });
}

export async function updateTrainingProgress(req, res) {
  const employeeId = req.body.employeeId || req.user.employeeId;
  if (employeeId !== req.user.employeeId && req.user.role !== 'hr') {
    throw ApiError.forbidden('You can only update your own progress.');
  }

  const program = await findProgram(req.params.id);
  const enrollment = findEnrollment(program, employeeId);
  if (!enrollment) throw ApiError.badRequest('This employee is not enrolled in the programme.');

  const progress = Math.round(req.body.progress);
  enrollment.progress = progress;
  enrollment.status = statusFor(progress);
  if (progress >= 100) {
    enrollment.completedOn = enrollment.completedOn || todayISO();
  } else {
    enrollment.completedOn = null;
  }
  await program.save();

  if (progress >= 100) {
    await recordActivity({
      employeeId,
      text: `completed “${program.title}”`,
      type: 'training',
    });
  }

  res.json({ data: serializeTraining(program) });
}

export async function assignTraining(req, res) {
  const program = await findProgram(req.params.id);
  const employeeIds = [...new Set(req.body.employeeIds.map(String))];

  const employees = await Employee.find({ _id: { $in: employeeIds } }).select('name managerId systemRole').lean();
  if (employees.length !== employeeIds.length) {
    throw ApiError.badRequest('One or more selected employees could not be found.');
  }

  if (req.user.role === 'manager') {
    const outOfScope = employees.filter(
      (employee) =>
        employee._id.toString() !== req.user.employeeId &&
        employee.managerId?.toString() !== req.user.employeeId,
    );
    if (outOfScope.length) {
      throw ApiError.forbidden('Managers can only assign training within their direct team.');
    }
  }

  if (req.body.dueDate) program.dueDate = req.body.dueDate;

  const added = [];
  for (const employee of employees) {
    if (!findEnrollment(program, employee._id)) {
      program.enrolled.push({
        employee: employee._id,
        progress: 0,
        status: 'Not started',
        assignedOn: todayISO(),
        completedOn: null,
      });
      added.push(employee);
    }
  }
  await program.save();

  if (added.length) {
    await notifyMany(
      added.map((employee) => employee._id),
      {
        type: 'training',
        title: `New training assigned · ${program.title}`,
        body: `${program.format}${program.dueDate ? ` · due ${program.dueDate}` : ''}`,
        href: '/training',
      },
    );
  }

  await recordActivity({
    employeeId: req.user.employeeId,
    text: `assigned “${program.title}” to ${added.length || 0} ${added.length === 1 ? 'person' : 'people'}`,
    type: 'training',
  });

  res.json({ data: serializeTraining(program) });
}

export { notify };
