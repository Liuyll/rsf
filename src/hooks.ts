import { useCallback } from 'react'
import { useDB } from 'rexos'
import { useFetch, FetchResult }from './fetch'

function useRsf(url:string, datas: any[], options: Object):FetchResult
function useRsf(url:string, options: Object):FetchResult
function useRsf(options: Object):FetchResult

function useRsf(url:string, data ?: any[] | object , options ?: Object ): FetchResult {
    let _options
    if(!data) {
        if(typeof url === 'string') {
            _options = { url }
        } else {
            _options = url
        }
    } else if(options) {
        _options = options
        _options.url = url
        _options.data = data
    } else {
        if(Array.isArray(data)) {
            _options = {
                url,
                data
            } 
        } else {
            _options = data
            _options.url = url
        }
    }

    const fetch = useCallback(() => useDB(true, _options), _options.data || [])
    return useFetch(fetch)
}

export {
    useRsf
}