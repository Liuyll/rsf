'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');
var rexos = require('rexos');

const hasOwn = Object.prototype.hasOwnProperty;
function is(x, y) {
    if (x === y) {
        return x !== 0 || y !== 0 || 1 / x === 1 / y;
    }
    else {
        return x !== x && y !== y;
    }
}
function shallowEqual(objA, objB) {
    if (is(objA, objB))
        return true;
    if (typeof objA !== 'object' || objA === null ||
        typeof objB !== 'object' || objB === null) {
        return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length)
        return false;
    for (let i = 0; i < keysA.length; i++) {
        if (!hasOwn.call(objB, keysA[i]) ||
            !is(objA[keysA[i]], objB[keysA[i]])) {
            return false;
        }
    }
    return true;
}

const isComplicatedParams = (params) => params.some(p => (typeof p === 'object' && p != null) || typeof p === 'function');
const genCacheString = (fn, args) => fn.toString() + args.toString();
class CacheRepo {
    constructor(isFunctionCacheMode = false) {
        this.repo = new Map();
        this.complicatedParamRepo = new Map();
        this.valueRepo = {};
        this.isFunctionCacheMode = isFunctionCacheMode;
    }
    set(fn, data, args = [], options) {
        if (options.expire) {
            data.__cache_expire = options.expire;
            data.__cache_start = new Date().getTime();
        }
        if (options.expireTime) {
            data.__cache_expireTime = options.expireTime;
        }
        setToCache(fn, this.isFunctionCacheMode, data, this.repo, this.complicatedParamRepo, args);
    }
    clear(fn, args = []) {
        clearFromCache(fn, this.isFunctionCacheMode, args, this.repo, this.complicatedParamRepo);
    }
    get(fn, args = []) {
        const data = getFromCache(fn, args, this.isFunctionCacheMode, this.repo, this.complicatedParamRepo);
        return data;
    }
}
class FetchRepo {
    constructor(isFunctionCacheMode) {
        this.repo = new Map();
        this.complicatedParamRepo = new Map();
        this.isFunctionCacheMode = isFunctionCacheMode;
    }
    get(fn, args) {
        const future = getFromCache(fn, args, this.isFunctionCacheMode, this.repo, this.complicatedParamRepo);
        return future;
    }
    set(fn, ret, args = []) {
        setToCache(fn, this.isFunctionCacheMode, ret, this.repo, this.complicatedParamRepo, args);
    }
    clear(fn, args = []) {
        clearFromCache(fn, this.isFunctionCacheMode, args, this.repo, this.complicatedParamRepo);
    }
}
const handleExpireData = (data) => {
    if (!data)
        return data;
    const currentTimeStamp = new Date().getTime();
    if (data.__cache_expire) {
        if (data.__cache_start + data.__cache_expire < currentTimeStamp)
            return null;
        const handledData = JSON.parse(JSON.stringify(data));
        delete handledData.__cache_expire;
        delete handledData.__cache_start;
        return handledData;
    }
    else if (data.__cache_expireTime) {
        if (currentTimeStamp > data.__cache_expireTime)
            return null;
        const handledData = JSON.parse(JSON.stringify(data));
        delete handledData.__cache_expireTime;
        return handledData;
    }
    return data;
};
const getComplicatedCache = (fnCache, args) => {
    if (!fnCache)
        return null;
    try {
        fnCache.forEach((data, cacheParams) => {
            if (shallowEqual(cacheParams, args))
                throw data;
        });
    }
    catch (data) {
        return handleExpireData(data);
    }
    return null;
};
const getFromCache = (fn, args, isFunctionCacheMode, cache, complicatedCache) => {
    if (isFunctionCacheMode)
        return handleExpireData(cache.get(fn));
    if (isComplicatedParams(args)) {
        const fnCache = complicatedCache.get(fn);
        getComplicatedCache(fnCache, args);
    }
    return handleExpireData(cache.get(genCacheString(fn, args)));
};
const setToCache = (fn, isFunctionCacheMode, ret, cache, complicatedCache, args = []) => {
    if (isFunctionCacheMode) {
        cache.set(fn, ret);
    }
    else {
        if (isComplicatedParams(args)) {
            const fnCache = complicatedCache.get(fn);
            if (!fnCache)
                complicatedCache.set(fn, new Map([[args, ret]]));
            else
                fnCache.set(args, ret);
        }
        else
            cache.set(genCacheString(fn, args), ret);
    }
};
const clearFromCache = (fn, isFunctionCacheMode, args = [], cache, complicatedCache) => {
    if (isFunctionCacheMode)
        cache.delete(fn);
    else {
        if (isComplicatedParams(args)) {
            const fnCache = complicatedCache.get(fn);
            const params = getComplicatedCache(fnCache, args);
            fnCache.delete(params);
        }
        cache.delete(genCacheString(fn, args));
    }
};

const makeInitRepo = (isFunctionCacheMode) => ({
    cacheRepo: new CacheRepo(isFunctionCacheMode),
    fetchRepo: new FetchRepo(isFunctionCacheMode)
});
const Context = React.createContext(makeInitRepo(false));
const Provider = Context.Provider;

class Boundary extends React.Component {
    constructor(options) {
        super(options);
        let { loading, children, error, isFunctionCacheMode = false, } = options;
        this.state = {
            loading,
            render: children,
            err: false,
            isFunctionCacheMode
        };
        this.error = error;
    }
    static getDerivedStateFromError(err) {
        return {
            err: true
        };
    }
    componentDidCatch(err) {
        if (typeof this.error === 'function') {
            this.error = this.error(err);
        }
    }
    render() {
        return (React.createElement(Provider, { value: makeInitRepo(this.state.isFunctionCacheMode) },
            React.createElement(React.Suspense, { fallback: this.state.loading }, this.state.err ? this.error : this.state.render)));
    }
}

const handleParams = (fetch, args, options) => {
    let _options;
    if (typeof fetch === 'object')
        _options = fetch;
    else if (typeof args === 'object' && !Array.isArray(args))
        _options = Object.assign(Object.assign({}, args), { fetch });
    else if (typeof options === 'object' || options === undefined)
        _options = Object.assign(Object.assign({}, options ? options : {}), { args,
            fetch });
    else
        throw Error('useFetch params is not satisfy!');
    if (!Array.isArray(_options.args))
        throw Error(`useFetch second params --- args only accept array type or non!`);
    if (typeof _options.fetch !== 'function')
        throw Error(`useFetch second params --- fetch only accept function type!`);
    return _options;
};
const _useFetch = (fetch, args = []) => {
    let status = 'pending', ret;
    const task = fetch(...args).then(r => {
        status = 'resolve';
        ret = r;
    }, e => {
        status = 'reject';
        ret = e;
    });
    return {
        get() {
            if (status === 'pending')
                throw task;
            else if (status === 'resolve')
                return ret;
            else
                throw ret;
        }
    };
};
const useFetch = (fetch, args = [], options) => {
    const params = handleParams(fetch, args, options);
    fetch = params.fetch, args = params.args;
    const { expire, expireTime } = params;
    if (expire && expireTime)
        throw Error(`useFetch can't accept expire and expireTime simultaneously`);
    const repo = React.useContext(Context);
    const { cacheRepo, fetchRepo } = repo;
    let cache;
    let data;
    const refresh = () => {
        cacheRepo.clear(fetch, args);
        return useFetch(fetch, args);
    };
    if ((cache = cacheRepo.get(fetch, args))) {
        return [cache, refresh];
    }
    debugger;
    if ((cache = fetchRepo.get(fetch, args))) {
        data = cache.get();
    }
    else {
        const future = _useFetch(fetch, args);
        fetchRepo.set(fetch, future, args);
        future.get();
    }
    fetchRepo.clear(fetch, args);
    cacheRepo.set(fetch, data, args, {
        expire,
        expireTime
    });
    return [data, refresh];
};

function useRsf(url, data, options) {
    let _options;
    if (!data) {
        if (typeof url === 'string') {
            _options = { url };
        }
        else {
            _options = url;
        }
    }
    else if (options) {
        _options = options;
        _options.url = url;
        _options.data = data;
    }
    else {
        if (Array.isArray(data)) {
            _options = {
                url,
                data
            };
        }
        else {
            _options = data;
            _options.url = url;
        }
    }
    const fetch = React.useCallback(() => rexos.useDB(true, _options), _options.data || []);
    return useFetch(fetch);
}

exports.Boundary = Boundary;
exports.useFetch = useFetch;
exports.useRsf = useRsf;
//# sourceMappingURL=rsf.js.map
