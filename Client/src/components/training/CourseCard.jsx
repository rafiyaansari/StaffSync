import Icon from '../ui/Icon';
import Avatar, { AvatarGroup } from '../ui/Avatar';
import Badge from '../ui/Badge';
import { ProgressBar } from '../ui/Progress';
import { formatDate } from '../../utils/date';
import { trainingStatusTone } from '../../utils/ui';

export default function CourseCard({ course, enrollment, mode = 'employee', onOpen, onAssign, style }) {
  const enrolledPeople = course.enrolled || [];
  const avgProgress = enrolledPeople.length
    ? Math.round(enrolledPeople.reduce((sum, entry) => sum + entry.progress, 0) / enrolledPeople.length)
    : 0;

  const open = () => onOpen?.(course);

  return (
    <article
      className="course-card"
      onClick={open}
      tabIndex={0}
      role="button"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      }}
      style={style}
    >
      <div className={`course-card__cover tone-${course.tone || 'blue'}`.trim()}>
        <span className="course-card__cover-icon">
          <Icon name="graduation" size={22} />
        </span>
        <div className="course-card__cover-badges">
          <Badge tone="navy" size="sm">{course.category}</Badge>
          {course.mandatory ? <Badge tone="red" size="sm">Mandatory</Badge> : null}
        </div>
        <span className="course-card__format">{course.format}</span>
      </div>

      <div className="course-card__body">
        <h3 className="course-card__title">{course.title}</h3>
        <p className="course-card__description">{course.description}</p>

        <div className="course-card__meta">
          <span><Icon name="clock" size={13} /> {Math.floor(course.durationMins / 60)}h {course.durationMins % 60 ? `${course.durationMins % 60}m` : ''}</span>
          <span><Icon name="layers" size={13} /> {course.modules} modules</span>
          <span><Icon name="user" size={13} /> {course.instructor}</span>
        </div>

        {mode === 'employee' && enrollment ? (
          <div className="course-card__progress">
            <div className="course-card__progress-top">
              <span className={`badge badge--${trainingStatusTone(enrollment.status)} badge--sm`}>
                {enrollment.status}
              </span>
              <span className="course-card__percent">{enrollment.progress}%</span>
            </div>
            <ProgressBar
              value={enrollment.progress}
              tone={course.tone || 'blue'}
              size="sm"
            />
            <span className="course-card__due">
              {enrollment.completedOn
                ? `Completed ${formatDate(enrollment.completedOn)}`
                : `Due ${formatDate(course.dueDate)}`}
            </span>
          </div>
        ) : null}

        {mode === 'employee' && !enrollment ? (
          <div className="course-card__footer">
            <span className="course-card__due">Due {formatDate(course.dueDate)}</span>
            <span className="course-card__cta">
              View course <Icon name="arrowRight" size={13} />
            </span>
          </div>
        ) : null}

        {mode !== 'employee' ? (
          <div className="course-card__team">
            <div className="course-card__team-top">
              <AvatarGroup
                people={enrolledPeople.slice(0, 4).map((entry) => ({
                  id: entry.employeeId,
                  name: entry.employeeName || 'Teammate',
                }))}
                size="xs"
                max={4}
              />
              <span className="course-card__enrolled">
                {enrolledPeople.length} enrolled
              </span>
              <span className="course-card__percent">{avgProgress}%</span>
            </div>
            <ProgressBar value={avgProgress} tone={course.tone || 'blue'} size="sm" />
            <div className="course-card__team-footer">
              <span className="course-card__due">Due {formatDate(course.dueDate)}</span>
              <button
                type="button"
                className="course-card__assign"
                onClick={(event) => {
                  event.stopPropagation();
                  onAssign?.(course);
                }}
              >
                <Icon name="userPlus" size={13} /> Assign
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
