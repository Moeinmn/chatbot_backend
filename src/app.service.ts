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
  readonly sbApiKey = process.env.SUPABASE_API_KEY;
  readonly sbUrl = process.env.SUPABASE_URL_LC_CHATBOT;
  readonly openAIApiKey = process.env.OPENAI_API_KEY;
  readonly modelName = process.env.LLM_MODEL_NAME;

  readonly llm: any = new ChatOpenAI({
    openAIApiKey: this.openAIApiKey,
    temperature: 0,
    //modelName: "gpt-3.5-turbo-16k"
  });

  client = createClient(this.sbUrl, this.sbApiKey);

  embeddings = new OpenAIEmbeddings({ openAIApiKey: this.openAIApiKey });

  vectorStore = new SupabaseVectorStore(this.embeddings, {
    client: this.client,
    tableName: 'documents',
    //tableName: 'landin',
    queryName: 'match_documents',
  });

  private _combineDocuments(docs) {
    return docs.map((doc) => doc.pageContent).join('\n\n');
  }

  async QAHttpService(message: string) {
    // const llm = new ChatOpenAI({
    //   openAIApiKey,
    //   temperature: 0,
    //   //modelName: "gpt-3.5-turbo-16k"
    // });

    const retriever = this.vectorStore.asRetriever(1);

    const standaloneQuestionTemplate = `Generate a standalone question, from this conversation , return in persian language.
      question: {question} 
      standalone question:`;

    const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
      standaloneQuestionTemplate,
    );

    const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about ساپ based on the context provided. 
  Try to find the answer in the context. If you really don't know the answer, say "I'm sorry, I don't know the answer to that."
   And direct the questioner to email email@sap.com. Don't try to make up an answer. Always speak as if you were chatting to a friend and give as much information as you can also always speake in persian.
   context: {context}
   question: {question}
   answer: `;
    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

    const standaloneQuestionChain = RunnableSequence.from([
      standaloneQuestionPrompt,
      this.llm,
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
      this._combineDocuments,
      // (e) => {
      //     console.log({ e });
      //     return e;
      // },
    ]);

    const answerChain = RunnableSequence.from([
      // (e) => {
      //   console.log({ e });
      //   return e;
      // },
      answerPrompt,
      this.llm,
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
      question: `question:${message}`,
      //conv_history: formatConvHistory(conv_history)
    });

    console.log(response);

    return response;
  }
}
