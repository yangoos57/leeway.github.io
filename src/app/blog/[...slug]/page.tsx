import { notFound } from "next/navigation";
import { getPostSlugs, getPostBySlug } from "@/lib/api";
import markdownToHtml from "@/lib/markdownToHtml";

import { PostBody } from "@/components/post/post-main";
import { PostHeader } from "@/components/post/post-header";
import { join } from "path";
import { JsonLDComponent } from "@/components/post/metadata";
import Nav from "@/components/common/nav";

export default async function Post({ params }: { params: { slug: string[] } }) {
  const post = getPostBySlug(join(...params.slug));

  if (!post) {
    return notFound();
  }

  const content = await markdownToHtml(post.content || "");

  return (
    <div className="max-w-2xl 2xl:max-w-3xl mx-auto">
      <Nav />
      <JsonLDComponent post={post} />
      <article className="mb-32">
        <PostHeader
          title={post.title}
          date={post.date}
          category={post.category}
        />
        <PostBody content={content} />
      </article>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}) {
  const post = getPostBySlug(join(...params.slug));

  if (!post) {
    return notFound();
  }

  const title = `${post.title}`;

  return {
    openGraph: {
      title,
      images: [post.ogImage.url],
    },
  };
}

export async function generateStaticParams() {
  const slugs = getPostSlugs();

  return slugs.map((post) => ({
    slug: post.split("/"),
  }));
}
