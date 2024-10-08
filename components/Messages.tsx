import { trpc } from "@/app/_trpc/client";
import { INFITE_QUERY_LIMIT } from "@/config/infinite-query";
import { Loader2, MessageSquare } from "lucide-react";
import { FC, useContext, useEffect, useRef } from "react";
import Skeleton from "react-loading-skeleton";
import Message from "./Message";
import { ChatContext } from "./ChatContext";
import { useIntersection } from "@mantine/hooks";

interface MessagesProps {
  fileId: string;
}

let Messages: FC<MessagesProps> = ({ fileId }) => {
  let { isLoading: isAILoading } = useContext(ChatContext);

  let { data, isLoading, fetchNextPage } =
    trpc.getFileMessages.useInfiniteQuery(
      {
        fileId,
        limit: INFITE_QUERY_LIMIT,
      },
      {
        getNextPageParam: (lastPage) => lastPage?.nextCursor,
      }
    );

  let messages = data?.pages.flatMap((page) => page.messages);

  let loadingMessage = {
    createdAt: new Date().toISOString(),
    id: "loading-message",
    isUserMessage: false,
    text: (
      <span className="flex h-full items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    ),
  };

  let combinnedMessage = [
    ...(isAILoading ? [loadingMessage] : []),
    ...(messages ?? []),
  ];

  let lastMessageRef = useRef<HTMLDivElement>(null);

  let { ref, entry } = useIntersection({
    root: lastMessageRef.current,
    threshold: 1,
  });

  useEffect(() => {
    if (entry?.isIntersecting) {
      fetchNextPage();
    }
  }, [entry, fetchNextPage]);

  return (
    <div className="flex max-h-[calc(100vh-3.5rem-7rem)] border-zinc-200 flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch">
      {combinnedMessage && combinnedMessage.length > 0 ? (
        combinnedMessage.map((message, i) => {
          let isNextMessageSamePerson =
            combinnedMessage[i - 1]?.isUserMessage ===
            combinnedMessage[i]?.isUserMessage;

          if (i === combinnedMessage.length - 1) {
            return (
              <Message
                ref={ref}
                message={message}
                isMessageSamePerson={isNextMessageSamePerson}
                key={message.id}
              />
            );
          } else {
            return (
              <Message
                message={message}
                isMessageSamePerson={isNextMessageSamePerson}
                key={message.id}
              />
            );
          }
        })
      ) : isLoading ? (
        <div className="w-full flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <MessageSquare className="h-8 w-8 text-blue-500" />
          <h3 className="font-semibold text-xl">You&apos;re all set</h3>
          <p className="text-zinc-500 text-sm">
            Ask Your question to get Started
          </p>
        </div>
      )}
    </div>
  );
};

export default Messages;
