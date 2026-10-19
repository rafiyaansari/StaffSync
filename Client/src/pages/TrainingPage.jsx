import { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import Tabs from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/Progress';
import { SearchField, SelectField } from '../components/ui/FormFields';
import CourseCard from '../components/training/CourseCard';
import CourseModal from '../components/training/CourseModal';
import AssignTrainingModal from '../components/training/AssignTrainingModal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/date';
import { trainingStatusTone } from '../utils/ui';
import {
  availableCourses,
  myCourses,
  reportsOf,
  trainingEnrollment,
  trainingStats,
} from '../utils/selectors';

function EmployeeTraining() {
  const { currentEmployee, trainings } = useData();
  const [tab, setTab] = useState('mine');
  const [openCourse, setOpenCourse] = useState(null);

  const courses = myCourses(trainings, currentEmployee?.id);
  const catalog = availableCourses(trainings, currentEmployee?.id);
  const completed = courses.filter((course) => course.enrollment.status === 'Completed');
  const inProgress = courses.filter((course) => course.enrollment.status === 'In progress');
  const totalMinutes = courses.reduce((sum, course) => sum + course.durationMins, 0);
  const overall = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + course.enrollment.progress, 0) / courses.length)
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title="My learning"
        subtitle="Courses assigned to you, plus the wider Nimbus catalog."
        actions={
          <Button variant="primary" icon="bookOpen" onClick={() => setTab('catalog')}>
            Browse catalog
          </Button>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Enrolled courses"
          value={courses.length}
          icon="bookOpen"
          tone="navy"
          footnote={`${Math.round(totalMinutes / 60)}h of learning assigned`}
        />
        <StatCard
          label="In progress"
          value={inProgress.length}
          icon="play"
          tone="amber"
          footnote={inProgress[0]?.title || 'Nothing started yet'}
        />
        <StatCard
          label="Completed"
          value={completed.length}
          icon="award"
          tone="green"
          footnote={`${completed.length} certificate${completed.length === 1 ? '' : 's'} earned`}
        />
        <StatCard
          label="Overall progress"
          value={`${overall}%`}
          icon="target"
          tone="violet"
          footnote="Across all enrolled courses"
        />
      </div>

      <div className="section-head">
        <div>
          <h2 className="section-head__title">My courses</h2>
          <p className="section-head__sub">
            {courses.length} assigned · {catalog.length} more in the catalog
          </p>
        </div>
        <Tabs
          tabs={[
            { id: 'mine', label: 'Assigned to me', count: courses.length },
            { id: 'catalog', label: 'Catalog', count: catalog.length },
          ]}
          active={tab}
          onChange={setTab}
          ariaLabel="Training tabs"
        />
      </div>

      {tab === 'mine' ? (
        courses.length ? (
          <div className="course-grid">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                enrollment={course.enrollment}
                mode="employee"
                onOpen={(item) => setOpenCourse(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="surface">
            <EmptyState
              icon="graduation"
              title="No courses assigned yet"
              description="When your manager or HR assigns training, it will show up here."
              action={
                <Button variant="secondary" size="sm" onClick={() => setTab('catalog')}>
                  Browse the catalog
                </Button>
              }
            />
          </div>
        )
      ) : (
        <div className="course-grid">
          {catalog.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              enrollment={trainingEnrollment(course, currentEmployee?.id)}
              mode="employee"
              onOpen={(item) => setOpenCourse(item.id)}
            />
          ))}
        </div>
      )}

      <CourseModal courseId={openCourse} onClose={() => setOpenCourse(null)} />
    </>
  );
}

function ManagementTraining({ mode }) {
  const { employees, trainings } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState('courses');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCourse, setAssignCourse] = useState(null);
  const [openCourse, setOpenCourse] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const scope = useMemo(
    () => (mode === 'manager' ? reportsOf(employees, user?.id) : employees),
    [employees, mode, user?.id],
  );
  const scopeIds = useMemo(() => scope.map((employee) => employee.id), [scope]);
  const stats = trainingStats(trainings, scopeIds);

  // Managers see enrollment numbers for their own team; HR sees the whole company.
  const visibleCourses = useMemo(
    () =>
      mode === 'manager'
        ? trainings.map((course) => ({
            ...course,
            enrolled: course.enrolled.filter((entry) => scopeIds.includes(entry.employeeId)),
          }))
        : trainings,
    [trainings, mode, scopeIds],
  );

  const assignments = useMemo(() => {
    const rows = [];
    trainings.forEach((course) => {
      course.enrolled.forEach((entry) => {
        if (!scopeIds.includes(entry.employeeId)) return;
        const employee = employees.find((item) => item.id === entry.employeeId);
        if (!employee) return;
        rows.push({
          id: `${course.id}-${entry.employeeId}`,
          employee,
          course,
          entry,
        });
      });
    });
    return rows;
  }, [trainings, employees, scopeIds]);

  const filteredAssignments = assignments
    .filter((row) => {
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        row.employee.name.toLowerCase().includes(term) ||
        row.course.title.toLowerCase().includes(term);
      const matchesStatus = !status || row.entry.status === status;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => b.entry.progress - a.entry.progress);

  const columns = [
    {
      key: 'employee',
      label: 'Teammate',
      render: (row) => (
        <div className="cell-person">
          <Avatar name={row.employee.name} src={row.employee.avatar} size="sm" />
          <div className="cell-person__text">
            <span className="cell-person__name">{row.employee.name}</span>
            <span className="cell-person__meta">{row.employee.jobTitle}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      label: 'Course',
      render: (row) => (
        <div className="cell-stack">
          <span className="cell-stack__main">{row.course.title}</span>
          <span className="cell-stack__sub">{row.course.category}</span>
        </div>
      ),
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      sortValue: (row) => row.entry.progress,
      render: (row) => (
        <div className="table-progress table-progress--wide">
          <ProgressBar value={row.entry.progress} tone={row.course.tone || 'blue'} size="sm" />
          <span>{row.entry.progress}%</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge tone={trainingStatusTone(row.entry.status)} dot>
          {row.entry.status}
        </Badge>
      ),
    },
    {
      key: 'due',
      label: 'Due',
      sortable: true,
      sortValue: (row) => row.course.dueDate,
      render: (row) => <span className="nowrap text-sm">{formatDate(row.course.dueDate)}</span>,
    },
    {
      key: 'completed',
      label: 'Completed',
      render: (row) => (
        <span className="text-sm text-muted">
          {row.entry.completedOn ? formatDate(row.entry.completedOn) : '—'}
        </span>
      ),
    },
  ];

  const openAssign = (course = null) => {
    setAssignCourse(course);
    setAssignOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title={mode === 'manager' ? 'Team training' : 'Training & development'}
        subtitle={
          mode === 'manager'
            ? 'Assign courses, track progress and keep your team growing.'
            : 'Courses, assignments and completion across the whole company.'
        }
        actions={
          <Button variant="primary" icon="userPlus" onClick={() => openAssign(null)}>
            Assign training
          </Button>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Assignments"
          value={stats.assignments}
          icon="bookOpen"
          tone="navy"
          footnote={`${scope.length} ${mode === 'manager' ? 'teammates' : 'employees'} in scope`}
        />
        <StatCard
          label="In progress"
          value={stats.inProgress}
          icon="play"
          tone="amber"
          footnote={`${stats.notStarted} not started`}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon="award"
          tone="green"
          footnote="Certificates earned"
        />
        <StatCard
          label="Completion rate"
          value={`${stats.completionRate}%`}
          icon="target"
          tone="violet"
          footnote="Across all assignments"
        />
      </div>

      <div className="section-head">
        <div>
          <h2 className="section-head__title">Training at a glance</h2>
          <p className="section-head__sub">
            {visibleCourses.length} courses available · {stats.assignments} active assignments
          </p>
        </div>
        <Tabs
          tabs={[
            { id: 'courses', label: 'Courses', count: visibleCourses.length },
            { id: 'progress', label: 'Progress', count: assignments.length },
          ]}
          active={tab}
          onChange={setTab}
          ariaLabel="Training management tabs"
        />
      </div>

      {tab === 'courses' ? (
        <div className="course-grid">
          {visibleCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              mode="manage"
              onOpen={(item) => setOpenCourse(item.id)}
              onAssign={(item) => openAssign(item)}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card">
          <div className="table-toolbar">
            <div className="table-toolbar__search">
              <SearchField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search teammate or course…"
              />
            </div>
            <div className="table-toolbar__filters">
              <SelectField
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={['Completed', 'In progress', 'Not started']}
                placeholder="All statuses"
                wrapClassName="filter-control"
              />
            </div>
            <span className="table-toolbar__count">{filteredAssignments.length} assignments</span>
          </div>
          <DataTable
            columns={columns}
            rows={filteredAssignments}
            pageSize={9}
            ariaLabel="Training progress"
            emptyState={
              <EmptyState
                icon="graduation"
                title="No assignments found"
                description="Assign a course to get your team started."
                action={
                  <Button size="sm" variant="secondary" icon="userPlus" onClick={() => openAssign(null)}>
                    Assign training
                  </Button>
                }
              />
            }
          />
        </div>
      )}

      <CourseModal
        courseId={openCourse}
        onClose={() => setOpenCourse(null)}
        onAssign={(course) => {
          setOpenCourse(null);
          openAssign(course);
        }}
      />

      <AssignTrainingModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        courseId={assignCourse?.id || null}
        scope={mode === 'manager' ? scopeIds : null}
      />
    </>
  );
}

export default function TrainingPage() {
  const { role } = useAuth();
  if (role === 'employee') return <EmployeeTraining />;
  return <ManagementTraining mode={role} />;
}
