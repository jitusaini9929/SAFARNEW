import { useDMStore } from "@/store/dmStore";
import { IncomingRequestToast } from "./IncomingRequestToast";
import { DMChatWindow } from "./DMChatWindow";

export function DMLayer() {
  const incomingRequest = useDMStore((state) => state.incomingRequest);
  const acceptRequest = useDMStore((state) => state.acceptRequest);
  const declineRequest = useDMStore((state) => state.declineRequest);

  return (
    <>
      {incomingRequest && (
        <IncomingRequestToast
          request={incomingRequest}
          onAccept={() => acceptRequest(incomingRequest.requestId)}
          onDecline={() => declineRequest(incomingRequest.requestId)}
        />
      )}
      <DMChatWindow />
    </>
  );
}
