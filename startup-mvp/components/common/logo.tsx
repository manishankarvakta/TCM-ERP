import Image from 'next/image'
import React from 'react'

const Logo = () => {
  return (
    <div>
        <Image
              className="dark:invert"
              src="/next.svg"
              alt="Next.js logo"
              width={100}
              height={20}
              priority
            />
    </div>
  )
}

export default Logo