// Version custom scripts before Next compiles layout props into its client chunks.
export function reviseShellReferences(source, revision) {
  return source.replace(/(arrow-shell\.(?:js|css)\?v=)[a-zA-Z0-9-]+/g,(_,prefix)=>prefix+revision);
}
export function revisePlannerReferences(source, plannerRevision, nextRevision) {
  return source.replace(/autoPlanner\.js(?:\?v=[a-zA-Z0-9-]+)?/g,'autoPlanner.js?v='+plannerRevision)
    .replace(/next-move\.js(?:\?v=[a-zA-Z0-9-]+)?/g,'next-move.js?v='+nextRevision);
}
