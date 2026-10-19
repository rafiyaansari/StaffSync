import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Badge from '../ui/Badge';
import { ProgressBar } from '../ui/Progress';
import { useData } from '../../context/DataContext';
import { formatDate } from '../../utils/date';
import { trainingStatusTone } from '../../utils/ui';

export default function CourseModal({ courseId, onClose, onAssign }) {
  const { trainings, currentEmployee, enrollTraining, updateTrainingProgress } = useData();
  const course = trainings.find((item) => item.id === courseId);
  if (!course) return null;

  const enrollment = course.enrolled.find((entry) => entry.employeeId === currentEmployee?.id);
  const progress = enrollment?.progress || 0;
  const completedModules = Math.floor((progress / 100) * course.modules);

  return (
    <Modal
      open={Boolean(courseId)}
      onClose={onClose}
      title={course.title}
      subtitle={`${course.category} · ${course.instructor}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {onAssign ? (
            <Button variant="primary" icon="userPlus" onClick={() => onAssign(course)}>
              Assign to team
            </Button>
          ) : enrollment ? (
            <>
              <Button
                variant="secondary"
                icon="award"
                onClick={() => updateTrainingProgress(course.id, 100)}
                disabled={progress >= 100}
              >
                Mark complete
              </Button>
              <Button
                variant="primary"
                icon={progress >= 100 ? 'check' : 'play'}
                onClick={() =>
                  updateTrainingProgress(
                    course.id,
                    progress >= 100 ? 100 : Math.min(100, progress + 20),
                  )
                }
              >
                {progress >= 100 ? 'Course completed' : progress === 0 ? 'Start learning' : 'Continue learning'}
              </Button>
            </>
          ) : (
            <Button variant="primary" icon="plus" onClick={() => enrollTraining(course.id)}>
              Enroll in this course
            </Button>
          )}
        </>
      }
    >
      <div className="course-detail">
        <div className={`course-detail__cover tone-${course.tone || 'blue'}`.trim()}>
          <div>
            <Badge tone="navy">{course.category}</Badge>
            <h3 className="course-detail__cover-title">{course.title}</h3>
            <p className="course-detail__cover-meta">
              {course.format} · {course.level} · {Math.floor(course.durationMins / 60)}h{' '}
              {course.durationMins % 60 ? `${course.durationMins % 60}m` : ''}
            </p>
          </div>
          <Icon name="graduation" size={40} />
        </div>

        <p className="course-detail__description">{course.description}</p>

        <div className="detail-grid detail-grid--3">
          <div>
            <dt>Instructor</dt>
            <dd>{course.instructor}</dd>
          </div>
          <div>
            <dt>Modules</dt>
            <dd>{course.modules} lessons</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{formatDate(course.dueDate)}</dd>
          </div>
        </div>

        {enrollment ? (
          <div className="course-detail__progress">
            <div className="course-detail__progress-head">
              <div>
                <span className="course-detail__label">Your progress</span>
                <strong className="course-detail__percent">{progress}%</strong>
              </div>
              <Badge tone={trainingStatusTone(enrollment.status)} dot>
                {enrollment.status}
              </Badge>
            </div>
            <ProgressBar value={progress} tone={course.tone || 'blue'} size="lg" />
            <span className="course-detail__due">
              {enrollment.completedOn
                ? `Completed on ${formatDate(enrollment.completedOn)}`
                : `Assigned ${formatDate(enrollment.assignedOn)} · due ${formatDate(course.dueDate)}`}
            </span>
          </div>
        ) : (
          <div className="inline-alert inline-alert--info">
            <Icon name="info" size={15} />
            <span>You’re not enrolled yet. Enroll to start tracking your progress and certificate.</span>
          </div>
        )}

        <div className="course-detail__modules">
          <h4 className="course-detail__modules-title">Curriculum</h4>
          {Array.from({ length: course.modules }).map((_, index) => {
            const done = index < completedModules;
            const current = index === completedModules && progress < 100;
            return (
              <div
                className={`course-module ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`.trim()}
                key={index}
              >
                <span className="course-module__marker">
                  {done ? <Icon name="check" size={12} /> : <Icon name="play" size={11} />}
                </span>
                <div className="course-module__text">
                  <p className="course-module__title">Module {index + 1}</p>
                  <span className="course-module__meta">
                    {current ? 'In progress' : done ? 'Completed' : 'Not started'} ·{' '}
                    {Math.round(course.durationMins / course.modules)} min
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
