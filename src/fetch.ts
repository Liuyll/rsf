import { useContext } from 'react'
import { Context, IContextRepo } from './context'

type Data = any
type Refresh = Function
type FetchResult = [Data, Refresh]

type PromiseStatus = 'pending' | 'resolve' | 'reject'
interface IFuture {
    get:() => void
}

interface IOptions {
    fetch: (...args:any[]) => Promise<any>
    args ?: any[]
    expire ?: number
    expireTime ?: Date | number
}

const handleParams = (fetch: (...args:any[]) => Promise<any>, args: any[], options ?: IOptions):IOptions => {
    let _options: IOptions
    if(typeof fetch === 'object') _options = fetch
    else if(typeof args === 'object' && !Array.isArray(args)) _options = {
        ...(args as Object),
        fetch
    }
    else if(typeof options === 'object' || options === undefined) _options = {
        ...options ? options : {},
        args,
        fetch
    } 
    else throw Error('useFetch params is not satisfy!')
    
    if(!Array.isArray(_options.args)) throw Error(`useFetch second params --- args only accept array type or non!`)
    if(typeof _options.fetch !== 'function') throw Error(`useFetch second params --- fetch only accept function type!`)

    return _options
    
}

const _useFetch = (fetch: (...args:any[]) => Promise<any>, args: any[] = [], ):IFuture => {
    let status:PromiseStatus = 'pending', 
        ret:any 
    const task = fetch(...args).then(
        r => {
            status = 'resolve'
            ret = r
        },
        e => {
            status = 'reject'
            ret = e
        }
    )

    return  {
        get() {
            if(status === 'pending') throw task
            else if(status === 'resolve') return ret
            else throw ret
        }
    }
}

const useFetch = (fetch: (...args:any[]) => Promise<any>, args: any[] = [], options ?: IOptions): FetchResult => {
    const params = handleParams(fetch, args, options)
    fetch = params.fetch, args = params.args

    const {expire, expireTime} = params
    if(expire && expireTime) throw Error(`useFetch can't accept expire and expireTime simultaneously`)
    const repo:IContextRepo = useContext(Context)
    const {
        cacheRepo,
        fetchRepo
    } = repo

    let cache: any
    let data: any

    const refresh = () => {
        cacheRepo.clear(fetch, args)
        return useFetch(fetch, args)
    }

    if((cache = cacheRepo.get(fetch, args))) {
        return [cache, refresh]
    }

    debugger
    if((cache = fetchRepo.get(fetch, args))) {
        data = cache.get()
    } else {
        const future = _useFetch(fetch, args)
        fetchRepo.set(fetch, future, args)
        future.get()
    }
    
    fetchRepo.clear(fetch, args)
    cacheRepo.set(fetch, data, args, {
        expire,
        expireTime
    })
   
    return [data, refresh]
}

export {
    useFetch,
    FetchResult
}