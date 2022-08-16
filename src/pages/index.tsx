/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import format from 'date-fns/format';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import Head from 'next/head';
import styles from './home.module.scss';
import commonStyles from '../styles/common.module.scss';
import { getPrismicClient } from '../services/prismic';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
    readTime: number;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function Home({ postsPagination }: HomeProps) {
  function getReadTime(item: Post): number {
    const totalWords = item.data.content?.reduce((total, contentItem) => {
      // eslint-disable-next-line no-param-reassign
      total += contentItem.heading.split(' ').length;

      const words = contentItem.body.map(i => i.text.split(' ').length);
      // eslint-disable-next-line no-return-assign
      words.map(word => (total += word));
      return total;
    }, 0);
    return Math.ceil(totalWords / 200);
  }

  const formattedPost = postsPagination.results.map(post => {
    const readTime = getReadTime(post);

    return {
      ...post,
      data: {
        ...post.data,
        readTime,
      },
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
    };
  });

  const [posts, setPosts] = useState<Post[]>(formattedPost);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);
  const [currentPage, setCurrentPage] = useState(1);

  async function handleNextPage(): Promise<void> {
    if (currentPage !== 1 && nextPage === null) {
      return;
    }

    const postResults = await fetch(`${nextPage}`).then(response =>
      response.json()
    );
    setNextPage(postResults.next_page);
    setCurrentPage(postResults.page);

    const newPosts = postResults.results.map(post => {
      const readTime = getReadTime(post);

      return {
        uid: post.uid,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
          readTime,
        },
      };
    });

    setPosts([...posts, ...newPosts]);
  }

  return (
    <>
      <Head>
        <title> Home | spacetraveling </title>
      </Head>
      <main className={commonStyles.container}>
        <Header />
        <section className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a href="/" className={styles.post}>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <ul>
                  <li>
                    <FiCalendar />
                    {post.first_publication_date}
                  </li>
                  <li>
                    <FiUser />
                    {post.data.author}
                  </li>
                  <li>
                    <FiClock />
                    {`${post.data.readTime} min`}
                  </li>
                </ul>
              </a>
            </Link>
          ))}
          {nextPage && (
            <button type="button" onClick={handleNextPage}>
              Carregar mais posts
            </button>
          )}
        </section>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient({});

  const postsResponse = await prismic.getByType('posts', {
    pageSize: 1,
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
        content: post.data.content?.map(content => {
          return {
            heading: content.heading,
            body: [...content.body],
          };
        }),
      },
    };
  });

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };
  return {
    props: { postsPagination },
  };
};
