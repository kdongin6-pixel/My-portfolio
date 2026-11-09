export function shouldSkipBackgroundRefresh({visible,inFlight,saving,localEditPending,typing,modalOpen}){
  return !visible||inFlight||saving||localEditPending||typing||modalOpen;
}
