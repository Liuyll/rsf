import { createContext } from 'react'
import { CacheRepo, FetchRepo } from './cache'

const makeInitRepo = (isFunctionCacheMode: boolean) => ({
    cacheRepo: new CacheRepo(isFunctionCacheMode),
    fetchRepo: new FetchRepo(isFunctionCacheMode)
})

interface IContextRepo {
    cacheRepo: CacheRepo
    fetchRepo: FetchRepo
}

const Context = createContext(makeInitRepo(false))
const Provider = Context.Provider

export {
    Context,
    Provider,
    makeInitRepo,
    IContextRepo
}