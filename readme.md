# React Suspense Fetch

```sh
$ npm i -D @cprecioso/react-fetch       # if you use npm
$ yarn add --dev @cprecioso/react-fetch # if you use yarn
```

## API

_See the [docs](https://cprecioso.github.io/react-fetch/)_

## Quick-start

```tsx
import { makeFetchHook } from "@cprecioso/react-fetch";

const fetchJson = (...args) => fetch(...args).then((res) => res.json());

const usePost = makeFetchHook((id) => fetchJson(`/api/post/${id}`));

const Post = ({ id }) => {
  const { get, mutate, revalidate } = usePost([id]);

  const post = get();

  const addLike = async () => {
    // Update the count locally (doesn't trigger a re-request)
    mutate((post) => ({ ...post, likes: post.likes + 1 }));

    // Post your like to your backend, it returns the new like count.
    const newLikes = await fetchJson(`/api/post/${id}/like`, {
      method: "POST",
    });

    // Maybe some more people liked the post while you were in the
    // page, and the local count is not correct anymore.

    // Updates with the new count, and triggers a re-request.
    // If you didn't want a re-request here, you could use
    // `mutate` again instead.
    revalidate((post) => ({ ...post, likes: newLikes }));
  };

  return (
    <article>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
      <p>{post.likes} likes</p>
      <button onClick={addLike}>Like this post</button>
    </article>
  );
};
```
