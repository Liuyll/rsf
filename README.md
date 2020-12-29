# rsf

## use
```
import { useFetch, Boundary } from 'rsf'

function App() {
  return (
    <Boundary
      loading={<div>loading</div>}
      error={<div>error</div>}
    >
      <Profile></Profile>
    </Boundary>
  );
}

function Profile() {
  const [data] = useRsf('http://81.70.93.91/api/songlist?id=2429907335')
  return <div>{data.data}</div>
}
```