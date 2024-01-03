import { Injectable } from '@nestjs/common';

import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import {
  RunnableSequence,
  RunnablePassthrough,
} from 'langchain/schema/runnable';
import { StringOutputParser } from 'langchain/schema/output_parser';

@Injectable()
export class AppService {

  private combineDocuments(docs) {
    return docs.map((doc) => doc.pageContent).join('\n\n');
  }

  getHello(): string {
    return 'Hello World!';
  }
  async QAHttpService(message: string) {
    const sbApiKey = process.env.SUPABASE_API_KEY;
    const sbUrl = process.env.SUPABASE_URL_LC_CHATBOT;
    const openAIApiKey = process.env.OPENAI_API_KEY;

    const llm = new ChatOpenAI({
      openAIApiKey,
      temperature: 0,
      //modelName: "gpt-3.5-turbo-16k"
    });

    const client = createClient(sbUrl, sbApiKey);

    const embeddings = new OpenAIEmbeddings({ openAIApiKey });

    const vectorStore = new SupabaseVectorStore(embeddings, {
      client,
      tableName: 'documents',
      //tableName: 'landin',
      queryName: 'match_documents',
    });

    const retriever = vectorStore.asRetriever(2);

    const standaloneQuestionTemplate = `Generate a standalone question, from this conversation , return in persian language.
      question: {question} 
      standalone question:`;

    const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
      standaloneQuestionTemplate,
    );

    const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about ساپ based on the context provided. 
  Try to find the answer in the context. If you really don't know the answer, say "I'm sorry, I don't know the answer to that."
   And direct the questioner to email sap@digikala.com. Don't try to make up an answer. Always speak as if you were chatting to a friend and also speake in persian.
   context: {context}
   question: {question}
   answer: `;
    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

    const standaloneQuestionChain = RunnableSequence.from([
      standaloneQuestionPrompt,
      llm,
      new StringOutputParser(),
      // (e) => {
      //     console.log(e);
      //     return e;
      // },
    ]);
    const retrieverChain = RunnableSequence.from([
      (prevResult) => prevResult.standalone_question,
      // (e) => {
      //     console.log({ e });
      //     return e;
      // },
      retriever,
      this.combineDocuments,
      // (e) => {
      //     console.log({ e });
      //     return e;
      // },
    ]);

    const answerChain = RunnableSequence.from([
      (e) => {
        console.log({ e });
        return e;
      },
      answerPrompt,
      llm,
      new StringOutputParser(),
    ]);

    const chain = RunnableSequence.from([
      {
        standalone_question: standaloneQuestionChain,
        original_input: new RunnablePassthrough(),
      },
      {
        context: retrieverChain,
        question: ({ original_input }) => original_input.question,
      },
      answerChain,
    ]);

    //const conv_history = [];

    const response = await chain.invoke({
      question: `question: "
چرا سیستم در زمان محاسبه فاکتور قطع می‌شود؟    "`,
      //conv_history: formatConvHistory(conv_history)
    });

    console.log(response);
  }
}
