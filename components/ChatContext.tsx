import { createContext, ReactNode, useRef, useState } from "react";
import { useToast } from "./ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/app/_trpc/client";
import { INFITE_QUERY_LIMIT } from "@/config/infinite-query";

type StreamResponse = {
  addMessage: () => void;
  message: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
};

export let ChatContext = createContext<StreamResponse>({
  addMessage: () => {},
  message: "",
  handleInputChange: () => {},
  isLoading: false,
});

interface Props {
  fileId: string;
  children: ReactNode;
}

export const ChatContextProvider = ({ fileId, children }: Props) => {
  let [message, setMessage] = useState<string>("");
  let [isLoading, setIsLoading] = useState<boolean>(false);

  const utils = trpc.useUtils();
  let backupMessageRef = useRef("");

  let { toast } = useToast();

  let { mutate: sendMessage } = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const response = await fetch("/api/message", {
        method: "POST",
        body: JSON.stringify({
          fileId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return response.body;
    },

    onMutate: async ({ message }) => {
      backupMessageRef.current = message;
      setMessage("");

      await utils.getFileMessages.cancel();

      let previousMessages = utils.getFileMessages.getInfiniteData();

      utils.getFileMessages.setInfiniteData(
        {
          fileId,
          limit: INFITE_QUERY_LIMIT,
        },
        (old) => {
          if (!old) {
            return {
              pages: [],
              pageParams: [],
            };
          }

          let newPages = [...old.pages];

          let latestPage = newPages[0]!;

          latestPage.messages = [
            {
              createdAt: new Date().toString(),
              id: crypto.randomUUID(),
              text: message,
              isUserMessage: true,
            },
            ...latestPage.messages,
          ];

          newPages[0] = latestPage;

          return {
            ...old,
            pages: newPages,
          };
        }
      );

      setIsLoading(true);

      return {
        previousMessages:
          previousMessages?.pages.flatMap((page) => page.messages) ?? [],
      };
    },

    onSuccess: async (stream) => {
      setIsLoading(false);
      if (!stream) {
        return toast({
          title: "There was a problem sending this message",
          description: "Please refresh this page and try again",
          variant: "destructive",
        });
      }

      let reader = stream.getReader();
      let decoder = new TextDecoder();
      let done = false;

      // accumulated response

      let accResponse = "";

      while (!done) {
        let { value, done: doneReading } = await reader.read();
        done = doneReading;
        let chunkValue = decoder.decode(value);

        accResponse += chunkValue;

        // append chunk to message

        utils.getFileMessages.setInfiniteData(
          {
            fileId,
            limit: INFITE_QUERY_LIMIT,
          },
          (old) => {
            if (!old) return { pages: [], pageParams: [] };

            let isAIResponseCreated = old.pages.some((page) =>
              page.messages.some((message) => message.id === "ai-response")
            );

            let updatedPages = old.pages.map((page) => {
              if (page === old.pages[0]) {
                let updatedMessages;

                if (!isAIResponseCreated) {
                  updatedMessages = [
                    {
                      createdAt: new Date().toISOString(),
                      id: "ai-response",
                      text: accResponse,
                      isUserMessage: false,
                    },
                    ...page.messages,
                  ];
                } else {
                  updatedMessages = page.messages.map((message) => {
                    if (message.id === "ai-response") {
                      return {
                        ...message,
                        text: accResponse,
                      };
                    }
                    return message;
                  });
                }

                return {
                  ...page,
                  messages: updatedMessages,
                };
              }

              return page;
            });

            return {
              ...old,
              pages: updatedPages,
            };
          }
        );
      }
    },

    onError: (_, __, context) => {
      setMessage(backupMessageRef.current);
      utils.getFileMessages.setData(
        { fileId },
        { messages: context?.previousMessages ?? [] }
      );
    },

    onSettled: async () => {
      setIsLoading(false);

      await utils.getFileMessages.invalidate({
        fileId,
      });
    },
  });

  let handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  let addMessage = () => sendMessage({ message });

  return (
    <ChatContext.Provider
      value={{
        addMessage,
        handleInputChange,
        message,
        isLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
