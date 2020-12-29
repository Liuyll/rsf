import * as React from 'react'
import { Suspense } from 'react'
import { makeInitRepo, Provider } from './context'
import { CacheRepo } from './cache'

interface IBoundaryState {
    loading: React.ReactNode
    render: React.ReactNode
    err: boolean
    isFunctionCacheMode: boolean
}

interface IBoundaryOptions {
    loading: React.ReactNode
    children: React.ReactNode
    error ?: React.ReactNode | Function
    isFunctionCacheMode ?: boolean
}

class Boundary extends React.Component<IBoundaryOptions, IBoundaryState> {
    private error: React.ReactNode | Function
    constructor(options: IBoundaryOptions) {
        super(options)
        let { 
            loading,
            children,
            error,
            isFunctionCacheMode = false,
        } = options 

        this.state = {
            loading,
            render: children,
            err: false,
            isFunctionCacheMode
        }
        this.error = error
    }

    static getDerivedStateFromError(err) {
        return {
            err: true
        }
    }

    componentDidCatch(err) {
        if(typeof this.error === 'function') {
            this.error = this.error(err)
        }
    }
    
    render() {
        return (
            <Provider value={makeInitRepo(this.state.isFunctionCacheMode)}>
                <Suspense fallback={this.state.loading}>
                    {this.state.err ? this.error : this.state.render}
                </Suspense>
            </Provider>
        )
    }
}

export {
    Boundary
}
