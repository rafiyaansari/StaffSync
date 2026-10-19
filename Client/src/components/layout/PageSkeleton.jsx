export default function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Loading your workspace">
      <div className="page-skeleton__header">
        <span className="skel skel--title" />
        <span className="skel skel--subtitle" />
      </div>
      <div className="page-skeleton__stats">
        {[0, 1, 2, 3].map((item) => (
          <span className="skel skel--stat" key={item} />
        ))}
      </div>
      <div className="page-skeleton__grid">
        <span className="skel skel--panel" />
        <span className="skel skel--panel" />
      </div>
    </div>
  );
}
