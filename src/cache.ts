import { shallowEqual } from './utils'

type Params = any[]
type Data = any
interface IValueRepo {
    [key:string]: Data
}

type EasyCache = Map<string | Function, any>
type ComplicatedCache = Map<Function, Map<Params, any>>

interface IGetComplicatedCache {
    (fnCache: Map<Params, Data>, args: any[]): any
    (fnCache: Map<Params, Data>, args: any[], needParams: true): Params 
}

interface ICacheRepo {
    isFunctionCacheMode:boolean
    get(fn: Function, args ?: any[]): Data | undefined
    clear(fn:Function,args ?: any[]): any
    set(fn:Function, data:any, args ?: any[], options ?: ICacheOptions): any
}

interface IFetchRepo {
    isFunctionCacheMode:boolean
    get(fn: Function, args ?: any[]): any
    set(fn:Function, data:any, args ?: any[], options ?: ICacheOptions): any
}

interface ICacheOptions {
    expire: number
    expireTime: number | Date
}

interface IFetchFuture {
    get(): any 
}

const isComplicatedParams = (params: Params) => 
    params.some(p => (typeof p === 'object' && p != null) || typeof p === 'function')

const genCacheString = (fn: Function, args: any[]) => 
    fn.toString() + args.toString()
    

class CacheRepo implements ICacheRepo {
    private repo: Map<Function | string, Data> = new Map()
    private complicatedParamRepo: Map<Function, Map<Params, Data>> = new Map()
    private valueRepo: IValueRepo = {} 
    isFunctionCacheMode:boolean

    constructor(isFunctionCacheMode:boolean = false) {
        this.isFunctionCacheMode = isFunctionCacheMode
    }

    set(fn:Function, data:any, args: any[] = [], options ?: ICacheOptions) {
        if(options.expire) {
            data.__cache_expire = options.expire
            data.__cache_start = new Date().getTime()
        } 
        if(options.expireTime) {
            data.__cache_expireTime = options.expireTime
        }
        setToCache(fn, this.isFunctionCacheMode, data, this.repo, this.complicatedParamRepo, args)
    }

    clear(fn:Function,args: any[] = []) {
        clearFromCache(fn, this.isFunctionCacheMode, args, this.repo, this.complicatedParamRepo)
    }

    get(fn: Function, args : any[] = []): Data | undefined {
        const data = getFromCache(fn, args, this.isFunctionCacheMode, this.repo, this.complicatedParamRepo)
        return data
    }
}

class FetchRepo implements IFetchRepo {
    private repo: Map<Function | string, IFetchFuture> = new Map()
    private complicatedParamRepo: Map<Function, Map<Params, IFetchFuture>> = new Map()
    isFunctionCacheMode:boolean
    
    constructor(isFunctionCacheMode: boolean) {
        this.isFunctionCacheMode = isFunctionCacheMode
    }

    get(fn: Function, args ?: any[]): any {
        const future = getFromCache(fn, args, this.isFunctionCacheMode, this.repo, this.complicatedParamRepo)
        return future
    }

    set(fn:Function, ret:any, args: any[] = []): any {
        setToCache(fn, this.isFunctionCacheMode, ret, this.repo, this.complicatedParamRepo, args)
    }

    clear(fn:Function, args: any[] = []) {
        clearFromCache(fn, this.isFunctionCacheMode, args, this.repo, this.complicatedParamRepo)
    }
}

const handleExpireData = (data: any) => {
    if(!data) return data
    const currentTimeStamp = new Date().getTime()

    if(data.__cache_expire) {
        if(data.__cache_start + data.__cache_expire < currentTimeStamp) return null
        const handledData = JSON.parse(JSON.stringify(data))
        delete handledData.__cache_expire
        delete handledData.__cache_start
        return handledData
    } else if(data.__cache_expireTime) {
        if(currentTimeStamp > data.__cache_expireTime) return null
        const handledData = JSON.parse(JSON.stringify(data))
        delete handledData.__cache_expireTime
        return handledData
    }

    return data
}

const getComplicatedCache:IGetComplicatedCache = (fnCache: Map<Params, Data>, args: any[]) => {
    if(!fnCache) return null
    try {
        fnCache.forEach((data, cacheParams) => {
            if(shallowEqual(cacheParams, args)) throw data
        })
    } catch(data) {
        return handleExpireData(data)
    }
    return null
}

const getFromCache = (fn: Function, args: any[], isFunctionCacheMode: boolean, cache: EasyCache, complicatedCache: ComplicatedCache) => {
    if(isFunctionCacheMode) return handleExpireData(cache.get(fn))
    if(isComplicatedParams(args)) {
        const fnCache = complicatedCache.get(fn)
        getComplicatedCache(fnCache, args)
    }
    return handleExpireData(cache.get(genCacheString(fn, args)))
}

const setToCache = (fn:Function, isFunctionCacheMode: boolean, ret: any, cache: EasyCache, complicatedCache: ComplicatedCache, args: any[] = []) => {
    if(isFunctionCacheMode) {
        cache.set(fn, ret)
    } else {
        if(isComplicatedParams(args)) {
            const fnCache = complicatedCache.get(fn)
            if(!fnCache) complicatedCache.set(fn, new Map([[args, ret]]))
            else fnCache.set(args, ret)
        }
        else cache.set(genCacheString(fn, args), ret)
    }
}

const clearFromCache = (fn:Function, isFunctionCacheMode: boolean, args: any[] = [], cache: EasyCache, complicatedCache: ComplicatedCache) => {
    if(isFunctionCacheMode) cache.delete(fn)
    else {
        if(isComplicatedParams(args)) {
            const fnCache = complicatedCache.get(fn)
            const params = getComplicatedCache(fnCache, args, true)
            fnCache.delete(params)
        }
        cache.delete(genCacheString(fn, args))
    }
}

export {
    CacheRepo,
    FetchRepo,
    ICacheRepo
}

