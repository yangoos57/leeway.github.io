import { PostCardGroup } from "@/components/post-card";
import { getAllPosts } from "@/lib/api";
import Nav from "@/components/common/nav";

export default async function Index({ params }: { params: { slug: string } }) {
  const allPosts = getAllPosts();
  const { slug } = params;
  const categories = allPosts.reduce((acc, post) => {
    post.category.forEach((category) => acc.add(category));
    return acc;
  }, new Set<string>());

  const filterName = categories.has(slug) ? slug : "all";

  const filteredPosts =
    filterName === "all"
      ? allPosts
      : allPosts.filter((v) => v.category.includes(filterName));

  return (
    <div className="max-w-2xl 2xl:max-w-3xl mx-auto">
      <Nav />
      <PostCardGroup params={filterName} posts={filteredPosts} />;
    </div>
  );
}
